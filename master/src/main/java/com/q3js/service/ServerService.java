package com.q3js.service;

import com.q3js.client.ServerStatusClient;
import com.q3js.domain.Server;
import com.q3js.service.dto.HeartbeatRequest;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerResponse;
import com.q3js.service.dto.ServerUserResponse;
import com.q3js.service.exception.ServerNotFoundException;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
@RequiredArgsConstructor
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);
    private static final int HEARTBEAT_TTL_MINUTES = 5;
    private static final String FFA_HOST = "ffa.q3js.com";
    private static final String PIETER_HOST = "q3.pieter.com";
    private static final int DEFAULT_PROXY_PORT = 443;

    private final Map<String, Server> servers = new ConcurrentHashMap<>();
    private final ServerStatusClient serverStatusClient;

    private volatile List<ServerResponse> serverResponseCache = List.of();

    public void handleHeartbeat(HeartbeatRequest heartbeatRequest) {
        if (heartbeatRequest.getTargetHost() == null) {
            LOG.warnf(
                    "Received heartbeat with null target host from proxy port %d",
                    heartbeatRequest.getProxyPort()
            );
            return;
        }

        String host = heartbeatRequest.getTargetHost();
        int proxyPort = heartbeatRequest.getProxyPort();
        int targetPort = heartbeatRequest.getTargetPort();
        boolean secure = heartbeatRequest.isSecure();
        OffsetDateTime now = OffsetDateTime.now();

        String key = key(host, proxyPort);

        servers.compute(key, (k, existing) -> {
            if (existing == null) {
                LOG.infof("Registering server from heartbeat %s:%d", host, proxyPort);
            } else {
                LOG.debugf("Refreshing heartbeat for %s:%d", host, proxyPort);
            }

            return Server.builder()
                    .host(host)
                    .proxyPort(proxyPort)
                    .targetPort(targetPort)
                    .secure(secure)
                    .lastHeartbeat(now)
                    .build();
        });
    }

    @Scheduled(every = "5s")
    public void refreshServerInfo() {
        addIfMissing(FFA_HOST, DEFAULT_PROXY_PORT, true);
        addIfMissing(PIETER_HOST, DEFAULT_PROXY_PORT, true);

        List<Server> snapshot = List.copyOf(servers.values());

        serverResponseCache = snapshot.stream()
                .map(server -> serverStatusClient.query(server)
                        .map(info -> new ServerResponse(
                                server.getHost(),
                                server.getProxyPort(),
                                server.getTargetPort(),
                                server.isSecure(),
                                info
                        )))
                .peek(result -> {
                    if (result.isEmpty()) {
                        // no-op here, logging happens below with explicit loop if needed
                    }
                })
                .flatMap(java.util.Optional::stream)
                .toList();

        for (Server server : snapshot) {
            boolean present = serverResponseCache.stream().anyMatch(r ->
                    r.getHost().equals(server.getHost()) && r.getProxyPort() == server.getProxyPort()
            );

            if (!present) {
                LOG.warnf(
                        "Failed to refresh server info for %s:%d (lastHeartbeat=%s)",
                        server.getHost(),
                        server.getProxyPort(),
                        server.getLastHeartbeat()
                );
            }
        }

        LOG.debugf(
                "Refresh complete: knownServers=%d visibleServers=%d",
                snapshot.size(),
                serverResponseCache.size()
        );
    }

    private void addIfMissing(String host, int proxyPort, boolean secure) {
        String key = key(host, proxyPort);

        servers.computeIfAbsent(key, k -> {
            LOG.infof("Adding static server %s:%d", host, proxyPort);
            return Server.builder()
                    .host(host)
                    .proxyPort(proxyPort)
                    .secure(secure)
                    .lastHeartbeat(OffsetDateTime.now())
                    .build();
        });
    }

    @Scheduled(every = "10s")
    public void pruneServers() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(HEARTBEAT_TTL_MINUTES);

        servers.entrySet().removeIf(entry -> {
            Server server = entry.getValue();
            boolean expired = cutoff.isAfter(server.getLastHeartbeat());

            if (expired) {
                LOG.warnf(
                        "Pruning server %s:%d, lastHeartbeat=%s",
                        server.getHost(),
                        server.getProxyPort(),
                        server.getLastHeartbeat()
                );
            }

            return expired;
        });
    }

    public List<ServerResponse> getAllServers() {
        return serverResponseCache.stream()
                .sorted(
                        Comparator.comparingInt(ServerService::getDisplayPriority)
                                .thenComparing(
                                        Comparator.comparingInt((ServerResponse s) -> getRealUsers(s).size())
                                                .reversed()
                                )
                )
                .toList();
    }

    private static int getDisplayPriority(ServerResponse server) {
        if (isServer(server, FFA_HOST, DEFAULT_PROXY_PORT)) {
            return 0;
        }

        if (isServer(server, PIETER_HOST, DEFAULT_PROXY_PORT)) {
            return 1;
        }

        return 2;
    }

    private static boolean isServer(ServerResponse server, String host, int proxyPort) {
        return host.equals(server.getHost()) && proxyPort == server.getProxyPort();
    }

    private static List<ServerUserResponse> getRealUsers(ServerResponse s) {
        return s.getInfo().getUsers().stream()
                .filter(u -> u.getPing() > 0)
                .toList();
    }

    public ServerInfoResponse getServerInfo(String id) {
        String[] parts = id.split(":", 2);
        if (parts.length != 2) {
            throw new ServerNotFoundException("Invalid server id: " + id);
        }

        String host = parts[0];
        int proxyPort = Integer.parseInt(parts[1]);

        Server server = servers.get(key(host, proxyPort));
        if (server == null) {
            throw new ServerNotFoundException("Server not found for id: " + id);
        }

        return serverStatusClient.query(server)
                .orElseThrow(() -> new ServerNotFoundException("Server not found for id: " + id));
    }

    private static String key(String host, int proxyPort) {
        return host + ":" + proxyPort;
    }
}
