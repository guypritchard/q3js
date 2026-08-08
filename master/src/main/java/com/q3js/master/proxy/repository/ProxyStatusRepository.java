package com.q3js.master.proxy.repository;

import com.q3js.master.proxy.domain.ProxyStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.Table;

import static com.q3js.master.database.generated.Tables.SERVERS;
import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.name;
import static org.jooq.impl.DSL.table;

@ApplicationScoped
public class ProxyStatusRepository {
    private static final Table<Record> PROXY_STATUSES = table(name("proxy_statuses"));
    private static final Table<Record> PROXY_STATUS_PLAYERS = table(name("proxy_status_players"));
    private static final Field<String> HOST = field(name("host"), String.class);
    private static final Field<Integer> PROXY_PORT = field(name("proxy_port"), Integer.class);
    private static final Field<Integer> CONNECTIONS = field(name("connections"), Integer.class);
    private static final Field<String> SOURCE_IP = field(name("source_ip"), String.class);
    private static final Field<java.time.OffsetDateTime> RECEIVED_AT =
        field(name("received_at"), java.time.OffsetDateTime.class);
    private static final Field<Integer> PLAYER_INDEX = field(name("player_index"), Integer.class);
    private static final Field<String> PLAYER_IP = field(name("ip"), String.class);
    private static final Field<String> PLAYER_NAME = field(name("name"), String.class);
    private static final Field<String> COUNTRY_CODE = field(name("country_code"), String.class);

    private final DSLContext dsl;

    public ProxyStatusRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public boolean isRegistered(String host, int proxyPort) {
        return dsl.fetchExists(
            dsl.selectOne()
                .from(SERVERS)
                .where(SERVERS.HOST.eq(host).and(SERVERS.PROXY_PORT.eq(proxyPort)))
        );
    }

    @Transactional
    public void upsert(ProxyStatus status) {
        dsl.insertInto(PROXY_STATUSES)
            .set(HOST, status.host())
            .set(PROXY_PORT, status.proxyPort())
            .set(CONNECTIONS, status.connections())
            .set(SOURCE_IP, status.sourceIp())
            .set(RECEIVED_AT, status.receivedAt())
            .onConflict(HOST, PROXY_PORT)
            .doUpdate()
            .set(CONNECTIONS, status.connections())
            .set(SOURCE_IP, status.sourceIp())
            .set(RECEIVED_AT, status.receivedAt())
            .execute();

        dsl.deleteFrom(PROXY_STATUS_PLAYERS)
            .where(HOST.eq(status.host()).and(PROXY_PORT.eq(status.proxyPort())))
            .execute();

        for (int index = 0; index < status.players().size(); index++) {
            var player = status.players().get(index);
            dsl.insertInto(PROXY_STATUS_PLAYERS)
                .set(HOST, status.host())
                .set(PROXY_PORT, status.proxyPort())
                .set(PLAYER_INDEX, index)
                .set(PLAYER_IP, player.ip())
                .set(PLAYER_NAME, player.name())
                .set(COUNTRY_CODE, player.countryCode())
                .execute();
        }
    }
}
