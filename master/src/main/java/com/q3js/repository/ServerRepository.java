package com.q3js.repository;

import com.q3js.domain.Server;
import com.q3js.jooq.tables.records.ServersRecord;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static com.q3js.jooq.tables.Servers.SERVERS;

@ApplicationScoped
@RequiredArgsConstructor
public class ServerRepository {
    private final DSLContext dsl;

    public void upsert(Server server) {
        OffsetDateTime now = OffsetDateTime.now();

        dsl.insertInto(SERVERS)
                .set(SERVERS.DISPLAY_ORDER, defaultInt(server.getDisplayOrder()))
                .set(SERVERS.PERMANENT, defaultBoolean(server.getPermanent()))
                .set(SERVERS.SECURE, defaultBoolean(server.getSecure()))
                .set(SERVERS.HOST, server.getHost())
                .set(SERVERS.PROXY_PORT, server.getProxyPort())
                .set(SERVERS.TARGET_HOST, server.getTargetHost())
                .set(SERVERS.TARGET_PORT, server.getTargetPort())
                .set(SERVERS.FS_GAME, server.getFsGame())
                .set(SERVERS.LAST_HEARTBEAT_AT, now)
                .onConflict(SERVERS.HOST, SERVERS.PROXY_PORT, SERVERS.TARGET_PORT)
                .doUpdate()
                .set(SERVERS.DISPLAY_ORDER, defaultInt(server.getDisplayOrder()))
                .set(SERVERS.PERMANENT, defaultBoolean(server.getPermanent()))
                .set(SERVERS.SECURE, defaultBoolean(server.getSecure()))
                .set(SERVERS.TARGET_HOST, server.getTargetHost())
                .set(SERVERS.FS_GAME, server.getFsGame())
                .set(SERVERS.LAST_HEARTBEAT_AT, now)
                .set(SERVERS.UPDATED_AT, now)
                .execute();
    }

    public List<Server> findAll() {
        return dsl.selectFrom(SERVERS)
                .orderBy(SERVERS.DISPLAY_ORDER.asc(), SERVERS.CREATED_AT.asc())
                .fetch(this::toDomain);
    }

    public Optional<Server> findById(Long id) {
        return dsl.selectFrom(SERVERS)
                .where(SERVERS.ID.eq(id))
                .fetchOptional(this::toDomain);
    }

    private Server toDomain(ServersRecord record) {
        return Server.builder()
                .id(record.getId())
                .displayOrder(record.getDisplayOrder())
                .permanent(record.getPermanent())
                .secure(record.getSecure())
                .host(record.getHost())
                .proxyPort(record.getProxyPort())
                .targetHost(record.getTargetHost())
                .targetPort(record.getTargetPort())
                .fsGame(record.getFsGame())
                .build();
    }

    public void upsertBasic(String clientIp, String targetHost, int proxyPort, int targetPort) {
        OffsetDateTime now = OffsetDateTime.now();

        dsl.insertInto(SERVERS)
                .set(SERVERS.HOST, clientIp)
                .set(SERVERS.PROXY_PORT, proxyPort)
                .set(SERVERS.TARGET_HOST, targetHost)
                .set(SERVERS.TARGET_PORT, targetPort)
                .set(SERVERS.LAST_HEARTBEAT_AT, now)
                .onDuplicateKeyUpdate()
                .set(SERVERS.TARGET_HOST, targetHost)
                .set(SERVERS.LAST_HEARTBEAT_AT, now)
                .set(SERVERS.UPDATED_AT, now)
                .execute();
    }

    private static Boolean defaultBoolean(Boolean value) {
        return value != null ? value : false;
    }

    private static Integer defaultInt(Integer value) {
        return value != null ? value : 0;
    }
}
