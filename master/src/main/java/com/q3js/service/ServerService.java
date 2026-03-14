package com.q3js.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.domain.Server;
import com.q3js.service.dto.ServerResponse;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);

    private static final long TIMEOUT_MS = 15_000;

    private final List<Server> servers;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final int infoTimeoutMs;
    private final String infoScheme;

    @Inject
    public ServerService(
            ObjectMapper objectMapper,
            @ConfigProperty(name = "q3js.server-info.timeout-ms", defaultValue = "3000") int infoTimeoutMs,
            @ConfigProperty(name = "q3js.server-info.scheme", defaultValue = "https") String infoScheme
    ) {
        this(
                objectMapper,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofMillis(infoTimeoutMs))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .version(HttpClient.Version.HTTP_1_1)
                        .build(),
                infoTimeoutMs,
                infoScheme,
                defaultServers()
        );
    }

    ServerService(
            ObjectMapper objectMapper,
            HttpClient httpClient,
            int infoTimeoutMs,
            String infoScheme,
            List<Server> initialServers
    ) {
        this.objectMapper = objectMapper;
        this.infoTimeoutMs = infoTimeoutMs;
        this.infoScheme = "https".equalsIgnoreCase(infoScheme) ? "https" : "http";
        this.httpClient = httpClient;
        this.servers = Collections.synchronizedList(new ArrayList<>(initialServers));
    }

    private static List<Server> defaultServers() {
        List<Server> servers = new ArrayList<>();

        servers.add(Server.builder()
                .proxyPort(443)
                .host("ffa.q3js.com")
                .targetPort(27960)
                .permanent(true)
                .lastUpdated(Instant.now().toEpochMilli())
                .order(1)
                .build());

        servers.add(Server.builder()
                .proxyPort(443)
                .host("ffa-cpma.q3js.com")
                .targetPort(27960)
                .permanent(true)
                .lastUpdated(Instant.now().toEpochMilli())
                .order(1)
                .build());

        servers.add(Server.builder()
                .proxyPort(443)
                .host("ctf.q3js.com")
                .targetPort(27960)
                .permanent(true)
                .lastUpdated(Instant.now().toEpochMilli())
                .order(2)
                .build());

        return servers;
    }

    public List<ServerResponse> getAllServers() {
        List<Server> snapshot;
        synchronized (servers) {
            snapshot = new ArrayList<>(servers);
        }

        List<ServerResponse> result = new ArrayList<>();
        for (Server server : snapshot) {
            Optional<ServerResponse> details = fetchServerDetails(server);
            if (details.isPresent()) {
                result.add(details.get());
            } else {
                LOG.warnf(
                        "Ignoring unreachable server %s:%d during listing",
                        server.getHost(),
                        server.getProxyPort()
                );
            }
        }

        return result;
    }

    public void refreshServer(Server server) {
        LOG.infof(
                "Ignoring dynamic server registration for %s:%d; only hardcoded servers are enabled",
                server.getHost(),
                server.getProxyPort()
        );

//        if (isLocalAddress(server.getHost())) {
//            LOG.warnf("Ignoring server with local proxy host: %s", server.getHost());
//            return;
//        }
//
//        // update timestamp before storing
//        server.setLastUpdated(Instant.now().toEpochMilli());
//
//        LOG.infof("Refreshing server: %s", server);
//        synchronized (servers) {
//            servers.remove(server); // remove old instance if exists
//            servers.add(server);
//        }
    }

    @Scheduled(every = "5s")
    void cleanup() {
        long now = Instant.now().toEpochMilli();
        long cutoff = now - TIMEOUT_MS;

        synchronized (servers) {
            servers.removeIf(server -> {
                if (server.isPermanent()) {
                    return false;
                }
                if (server.getLastUpdated() >= cutoff) {
                    return false;
                }
                LOG.infof("Removing stale server: %s", server);
                return true;
            });
        }
    }

    private boolean isLocalAddress(String host) {
        if (host == null || host.isBlank()) return true;

        host = host.trim().toLowerCase();

        try {
            var addr = InetAddress.getByName(host);
            return addr.isSiteLocalAddress();
        } catch (Exception e) {
            return true;
        }
    }

    private Optional<ServerResponse> fetchServerDetails(Server server) {
        try {
            var uri = new URI(infoScheme, null, server.getHost(), server.getProxyPort(), "/info", null, null);
            var request = HttpRequest.newBuilder(uri)
                    .version(HttpClient.Version.HTTP_1_1)
                    .timeout(Duration.ofMillis(infoTimeoutMs))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOG.warnf(
                        "Skipping server %s:%d, /info returned %d",
                        server.getHost(),
                        server.getProxyPort(),
                        response.statusCode()
                );
                return Optional.empty();
            }

            ServerResponse info = objectMapper.readValue(response.body(), ServerResponse.class);

            // Ensure routing-critical fields are always present in the response.
            info.setHost(server.getHost());
            info.setProxyPort(server.getProxyPort());
            info.setTargetPort(server.getTargetPort());
            if (info.getPort() == null) {
                info.setPort(server.getTargetPort());
            }
            if (info.getId() == null || info.getId().isBlank()) {
                info.setId(server.getHost() + ":" + server.getTargetPort());
            }
            if (info.getUsers() == null) {
                info.setUsers(new ArrayList<>());
            }
            if (info.getPlayers() == null) {
                info.setPlayers(info.getUsers().size());
            }

            return Optional.of(info);
        } catch (Exception e) {
            LOG.warnf(
                    e,
                    "Skipping server %s:%d, failed to fetch /info",
                    server.getHost(),
                    server.getProxyPort()
            );
            return Optional.empty();
        }
    }
}
