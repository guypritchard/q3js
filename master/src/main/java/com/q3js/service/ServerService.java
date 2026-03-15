package com.q3js.service;

import com.q3js.client.ServerStatusClient;
import com.q3js.controller.ServerController;
import com.q3js.domain.Server;
import com.q3js.service.dto.CurrentPlayerCountResponse;
import com.q3js.service.dto.HeartbeatRequest;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerResponse;
import com.q3js.service.exception.ServerNotFoundException;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@ApplicationScoped
@RequiredArgsConstructor
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);

    private final CopyOnWriteArrayList<Server> servers = new CopyOnWriteArrayList<>();
    private final ServerStatusClient serverStatusClient;

    private List<ServerResponse> serverResponseCache = List.of();

    public void handleHeartbeat(HeartbeatRequest heartbeatRequest) {
        LOG.infof("Received heartbeat from %s:%d", heartbeatRequest.getTargetHost(), heartbeatRequest.getProxyPort());

        var server = findServer(heartbeatRequest.getTargetHost(), heartbeatRequest.getProxyPort());
        if (server.isPresent()) {
            server.get().setLastHeartbeat(OffsetDateTime.now());
            server.get().setTargetPort(heartbeatRequest.getTargetPort());
            server.get().setSecure(heartbeatRequest.isSecure());
            return;
        }

        servers.add(Server.builder()
                .proxyPort(heartbeatRequest.getProxyPort())
                .host(heartbeatRequest.getTargetHost())
                .targetPort(heartbeatRequest.getTargetPort())
                .lastHeartbeat(OffsetDateTime.now())
                .secure(heartbeatRequest.isSecure())
                .build());
    }

    @Scheduled(every = "5s")
    public void refreshServerInfo() {
        serverResponseCache = servers.stream()
                .map(s -> {
                    return serverStatusClient.query(s)
                            .map(info -> {
                                return new ServerResponse(s.getHost(), s.getProxyPort(), s.getTargetPort(), s.isSecure(), info);
                            });
                })
                .flatMap(Optional::stream)
                .toList();
    }

    @Scheduled(every = "10s")
    public void pruneServers() {
        servers
                .removeIf(server -> OffsetDateTime.now().minusMinutes(1)
                        .isAfter(server.getLastHeartbeat()));
    }

    private Optional<Server> findServer(String host, int proxyPort) {
        return servers.stream()
                .filter(server -> server.getHost().equals(host) && server.getProxyPort() == proxyPort)
                .findFirst();
    }

    public List<ServerResponse> getAllServers() {
        return serverResponseCache
                .stream()
                .sorted(
                        Comparator.comparing(s -> s.getInfo().getSv_hostname())
                )
                .toList();
    }

    public ServerInfoResponse getServerInfo(String id) {
        var host = id.split(":")[0];
        var port = Integer.parseInt(id.split(":")[1]);

        return findServer(host, port)
                .flatMap(serverStatusClient::query)
                .orElseThrow(() -> new ServerNotFoundException("Server not found for id: " + id));
    }

    public CurrentPlayerCountResponse getCurrentPlayerCount() {
        var count = servers.stream()
                .map(serverStatusClient::query)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .map(ServerInfoResponse::getPlayers)
                .mapToInt(Integer::intValue)
                .sum();

        return CurrentPlayerCountResponse.builder()
                .count(count)
                .build();
    }
}
