package com.q3js.master.playerconnection.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.playerconnection.domain.PlayerConnection;
import com.q3js.master.playerconnection.domain.StoredPlayerConnection;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jooq.DSLContext;
import org.jooq.Condition;
import org.jooq.JSONB;
import org.jooq.impl.DSL;

import java.util.List;
import java.util.Map;

import static com.q3js.master.database.generated.Tables.PLAYER_CONNECTIONS;

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
        var record = dsl.newRecord(PLAYER_CONNECTIONS);
        record.setSourceIp(sourceIp);
        record.setClientIp(connection.clientIp());
        record.setPlayerName(connection.playerName());
        record.setUserinfo(JSONB.jsonb(userinfoJson(connection)));
        record.setServerHost(connection.serverHost());
        record.setServerPort(connection.serverPort());
        record.store();
    }

    public int count(String search) {
        return dsl.fetchCount(PLAYER_CONNECTIONS, searchCondition(search));
    }

    public List<StoredPlayerConnection> find(String search, int limit, int offset) {
        return dsl.selectFrom(PLAYER_CONNECTIONS)
            .where(searchCondition(search))
            .orderBy(PLAYER_CONNECTIONS.RECEIVED_AT.desc(), PLAYER_CONNECTIONS.ID.desc())
            .limit(limit)
            .offset(offset)
            .fetch(record -> new StoredPlayerConnection(
                record.getId(),
                record.getSourceIp(),
                record.getClientIp(),
                record.getPlayerName(),
                userinfo(record.getUserinfo()),
                record.getServerHost(),
                record.getServerPort(),
                record.getReceivedAt()
            ));
    }

    private static Condition searchCondition(String search) {
        String value = search == null ? "" : search.trim();
        if (value.isEmpty()) {
            return DSL.noCondition();
        }
        return PLAYER_CONNECTIONS.PLAYER_NAME.containsIgnoreCase(value)
            .or(PLAYER_CONNECTIONS.CLIENT_IP.containsIgnoreCase(value))
            .or(PLAYER_CONNECTIONS.SERVER_HOST.containsIgnoreCase(value));
    }

    private String userinfoJson(PlayerConnection connection) {
        try {
            return objectMapper.writeValueAsString(connection.userinfo());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize player userinfo.", exception);
        }
    }

    private Map<String, String> userinfo(JSONB value) {
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
