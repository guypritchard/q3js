package com.q3js.service;

import com.q3js.config.MasterServerConfig;
import com.q3js.domain.Server;
import com.q3js.repository.ServerRepository;
import com.q3js.service.client.ServerInfoClient;
import com.q3js.service.dto.HeartbeatRequest;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerResponse;
import io.quarkus.scheduler.Scheduled;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.List;

import static com.q3js.jooq.tables.Servers.SERVERS;

@RequiredArgsConstructor
@ApplicationScoped
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);
    private static final long HEARTBEAT_TTL_SECONDS = 60;
    private final MasterServerConfig masterServerConfig;
    private final ServerRepository serverRepository;
    private final ServerInfoClient serverInfoClient;
    private final DSLContext dsl;

    @Transactional
    @PostConstruct
    public void initializeDefaultServers() {
        var s1 = Server.builder()
                .proxyPort(443)
                .host("ffa.q3js.com")
                .targetPort(27960)
                .fsGame("baseq3")
                .secure(true)
                .permanent(true)
                .displayOrder(1)
                .build();

        var s2 = Server.builder()
                .proxyPort(443)
                .host("ffa-cpma.q3js.com")
                .targetPort(27960)
                .fsGame("cpma")
                .secure(true)
                .permanent(true)
                .displayOrder(2)
                .build();

        var s3 = Server.builder()
                .proxyPort(443)
                .host("ctf.q3js.com")
                .targetPort(27960)
                .fsGame("baseq3")
                .secure(true)
                .permanent(true)
                .displayOrder(3)
                .build();

        serverRepository.upsert(s1);
        serverRepository.upsert(s2);
        serverRepository.upsert(s3);
    }

    @Scheduled(every = "10s")
    @Transactional
    public void cleanup() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusSeconds(HEARTBEAT_TTL_SECONDS);
        int deleted = dsl.deleteFrom(SERVERS)
                .where(SERVERS.PERMANENT.isFalse())
                .and(SERVERS.LAST_HEARTBEAT_AT.isNotNull())
                .and(SERVERS.LAST_HEARTBEAT_AT.lt(cutoff))
                .execute();

        if (deleted > 0) {
            LOG.infof("Removed %d stale server registrations older than %s", deleted, cutoff);
        }
    }


    public List<ServerResponse> getAllServers() {
        return serverRepository.findAll()
                .stream()
                .map(this::toServerResponse)
                .toList();
    }

    private ServerResponse toServerResponse(Server server) {
        return ServerResponse.builder()
                .id(server.getId())
                .secure(server.getSecure())
                .host(server.getHost())
                .proxyPort(server.getProxyPort())
                .targetHost(server.getTargetHost())
                .targetPort(server.getTargetPort())
                .fsGame(server.getFsGame())
                .build();
    }

    public void handleHeartbeat(String clientIp, HeartbeatRequest heartbeatRequest) {
        serverRepository.upsertBasic(
                clientIp,
                heartbeatRequest.getTargetHost(),
                heartbeatRequest.getProxyPort(),
                heartbeatRequest.getTargetPort()
        );
    }

    public ServerInfoResponse fetchServerInfo(Long serverId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new NotFoundException("Server not found: " + serverId));
        LOG.debug(String.format(
                "Proxying server info for server %s using %s scheme and %dms timeout",
                serverId,
                masterServerConfig.serverInfo().scheme(),
                masterServerConfig.serverInfo().timeoutMs()
        ));
        return serverInfoClient.fetchServerInfo(server.getHost(), server.getProxyPort(), server.getTargetPort());
    }
}
