package com.q3js.master.playerconnection.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.playerconnection.domain.PlayerAddressName;
import com.q3js.master.playerconnection.domain.PlayerConnection;
import com.q3js.master.playerconnection.domain.StoredPlayerAddress;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.impl.DSL;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.q3js.master.database.generated.Tables.PLAYER_ADDRESSES;
import static com.q3js.master.database.generated.Tables.PLAYER_ADDRESS_NAMES;

@ApplicationScoped
public class PlayerConnectionRepository {
    private final DSLContext dsl;
    private final ObjectMapper objectMapper;

    public PlayerConnectionRepository(DSLContext dsl, ObjectMapper objectMapper) {
        this.dsl = dsl;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void insert(PlayerConnection connection, String sourceIp) {
        JSONB userinfo = JSONB.jsonb(userinfoJson(connection));

        dsl.insertInto(PLAYER_ADDRESSES)
            .set(PLAYER_ADDRESSES.IP_ADDRESS, connection.clientIp())
            .set(PLAYER_ADDRESSES.SOURCE_IP, sourceIp)
            .set(PLAYER_ADDRESSES.LAST_USERINFO, userinfo)
            .set(PLAYER_ADDRESSES.LAST_SERVER_HOST, connection.serverHost())
            .set(PLAYER_ADDRESSES.LAST_SERVER_PORT, connection.serverPort())
            .set(PLAYER_ADDRESSES.CONNECTION_COUNT, 1L)
            .set(PLAYER_ADDRESSES.FIRST_SEEN_AT, DSL.currentOffsetDateTime())
            .set(PLAYER_ADDRESSES.LAST_SEEN_AT, DSL.currentOffsetDateTime())
            .onConflict(PLAYER_ADDRESSES.IP_ADDRESS)
            .doUpdate()
            .set(PLAYER_ADDRESSES.SOURCE_IP, sourceIp)
            .set(PLAYER_ADDRESSES.LAST_USERINFO, userinfo)
            .set(PLAYER_ADDRESSES.LAST_SERVER_HOST, connection.serverHost())
            .set(PLAYER_ADDRESSES.LAST_SERVER_PORT, connection.serverPort())
            .set(PLAYER_ADDRESSES.CONNECTION_COUNT, PLAYER_ADDRESSES.CONNECTION_COUNT.add(1L))
            .set(PLAYER_ADDRESSES.FIRST_SEEN_AT, DSL.coalesce(PLAYER_ADDRESSES.FIRST_SEEN_AT, DSL.currentOffsetDateTime()))
            .set(PLAYER_ADDRESSES.LAST_SEEN_AT, DSL.currentOffsetDateTime())
            .execute();

        dsl.insertInto(PLAYER_ADDRESS_NAMES)
            .set(PLAYER_ADDRESS_NAMES.IP_ADDRESS, connection.clientIp())
            .set(PLAYER_ADDRESS_NAMES.PLAYER_NAME, connection.playerName())
            .set(PLAYER_ADDRESS_NAMES.CONNECTION_COUNT, 1L)
            .set(PLAYER_ADDRESS_NAMES.FIRST_SEEN_AT, DSL.currentOffsetDateTime())
            .set(PLAYER_ADDRESS_NAMES.LAST_SEEN_AT, DSL.currentOffsetDateTime())
            .onConflict(PLAYER_ADDRESS_NAMES.IP_ADDRESS, PLAYER_ADDRESS_NAMES.PLAYER_NAME)
            .doUpdate()
            .set(PLAYER_ADDRESS_NAMES.CONNECTION_COUNT, PLAYER_ADDRESS_NAMES.CONNECTION_COUNT.add(1L))
            .set(PLAYER_ADDRESS_NAMES.LAST_SEEN_AT, DSL.currentOffsetDateTime())
            .execute();
    }

    public int count(String search) {
        return dsl.fetchCount(PLAYER_ADDRESSES, searchCondition(search));
    }

    public List<StoredPlayerAddress> find(String search, int limit, int offset) {
        var addressRecords = dsl.select(
                PLAYER_ADDRESSES.IP_ADDRESS,
                PLAYER_ADDRESSES.SOURCE_IP,
                PLAYER_ADDRESSES.LAST_USERINFO,
                PLAYER_ADDRESSES.LAST_SERVER_HOST,
                PLAYER_ADDRESSES.LAST_SERVER_PORT,
                PLAYER_ADDRESSES.CONNECTION_COUNT,
                PLAYER_ADDRESSES.FIRST_SEEN_AT,
                PLAYER_ADDRESSES.LAST_SEEN_AT,
                PLAYER_ADDRESSES.BANNED_AT
            )
            .from(PLAYER_ADDRESSES)
            .where(searchCondition(search))
            .orderBy(PLAYER_ADDRESSES.LAST_SEEN_AT.desc().nullsLast(), PLAYER_ADDRESSES.IP_ADDRESS.asc())
            .limit(limit)
            .offset(offset)
            .fetch();

        List<String> addresses = addressRecords.getValues(PLAYER_ADDRESSES.IP_ADDRESS);
        Map<String, List<PlayerAddressName>> names = names(addresses);

        return addressRecords.map(record -> new StoredPlayerAddress(
            record.get(PLAYER_ADDRESSES.IP_ADDRESS),
            names.getOrDefault(record.get(PLAYER_ADDRESSES.IP_ADDRESS), List.of()),
            record.get(PLAYER_ADDRESSES.SOURCE_IP),
            userinfo(record.get(PLAYER_ADDRESSES.LAST_USERINFO)),
            record.get(PLAYER_ADDRESSES.LAST_SERVER_HOST),
            record.get(PLAYER_ADDRESSES.LAST_SERVER_PORT),
            record.get(PLAYER_ADDRESSES.CONNECTION_COUNT),
            record.get(PLAYER_ADDRESSES.FIRST_SEEN_AT),
            record.get(PLAYER_ADDRESSES.LAST_SEEN_AT),
            record.get(PLAYER_ADDRESSES.BANNED_AT)
        ));
    }

    private Map<String, List<PlayerAddressName>> names(List<String> addresses) {
        if (addresses.isEmpty()) {
            return Map.of();
        }

        Map<String, List<PlayerAddressName>> names = new LinkedHashMap<>();
        dsl.select(
                PLAYER_ADDRESS_NAMES.IP_ADDRESS,
                PLAYER_ADDRESS_NAMES.PLAYER_NAME,
                PLAYER_ADDRESS_NAMES.CONNECTION_COUNT,
                PLAYER_ADDRESS_NAMES.FIRST_SEEN_AT,
                PLAYER_ADDRESS_NAMES.LAST_SEEN_AT
            )
            .from(PLAYER_ADDRESS_NAMES)
            .where(PLAYER_ADDRESS_NAMES.IP_ADDRESS.in(addresses))
            .orderBy(
                PLAYER_ADDRESS_NAMES.IP_ADDRESS.asc(),
                PLAYER_ADDRESS_NAMES.LAST_SEEN_AT.desc(),
                PLAYER_ADDRESS_NAMES.PLAYER_NAME.asc()
            )
            .fetchGroups(PLAYER_ADDRESS_NAMES.IP_ADDRESS)
            .forEach((ipAddress, records) -> names.put(ipAddress, records.map(record -> new PlayerAddressName(
                record.get(PLAYER_ADDRESS_NAMES.PLAYER_NAME),
                record.get(PLAYER_ADDRESS_NAMES.CONNECTION_COUNT),
                record.get(PLAYER_ADDRESS_NAMES.FIRST_SEEN_AT),
                record.get(PLAYER_ADDRESS_NAMES.LAST_SEEN_AT)
            ))));
        return Collections.unmodifiableMap(names);
    }

    private static Condition searchCondition(String search) {
        String value = search == null ? "" : search.trim();
        if (value.isEmpty()) {
            return DSL.noCondition();
        }
        return PLAYER_ADDRESSES.IP_ADDRESS.containsIgnoreCase(value)
            .or(PLAYER_ADDRESSES.LAST_SERVER_HOST.containsIgnoreCase(value))
            .or(DSL.exists(
                DSL.selectOne()
                    .from(PLAYER_ADDRESS_NAMES)
                    .where(
                        PLAYER_ADDRESS_NAMES.IP_ADDRESS.eq(PLAYER_ADDRESSES.IP_ADDRESS)
                            .and(PLAYER_ADDRESS_NAMES.PLAYER_NAME.containsIgnoreCase(value))
                    )
            ));
    }

    private String userinfoJson(PlayerConnection connection) {
        try {
            return objectMapper.writeValueAsString(connection.userinfo());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize player userinfo.", exception);
        }
    }

    private Map<String, String> userinfo(JSONB value) {
        if (value == null) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(
                value.data(),
                new TypeReference<Map<String, String>>() {}
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not deserialize player userinfo.", exception);
        }
    }

}
