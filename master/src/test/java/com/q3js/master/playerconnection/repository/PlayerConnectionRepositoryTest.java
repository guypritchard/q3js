package com.q3js.master.playerconnection.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.playerconnection.domain.PlayerConnection;

import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlayerConnectionRepositoryTest {
    @Test
    void insertsPlayerConnections() throws Exception {
        var provider = new RecordingProvider();
        var repository = new PlayerConnectionRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES),
            new ObjectMapper()
        );

        repository.insert(
            new PlayerConnection(
                "203.0.113.7",
                "^1Ranger",
                Map.of("name", "^1Ranger", "rate", "25000"),
                "game.example.com",
                27961
            ),
            "10.0.0.1"
        );

        assertEquals(1, provider.executeCount);
        assertTrue(provider.sql.toLowerCase().contains("insert into \"player_connections\""));
        assertEquals("10.0.0.1", provider.bindings[0]);
        assertEquals("203.0.113.7", provider.bindings[1]);
        assertEquals("^1Ranger", provider.bindings[2]);
        assertEquals(
            Map.of("name", "^1Ranger", "rate", "25000"),
            new ObjectMapper().readValue(String.valueOf(provider.bindings[3]), Map.class)
        );
        assertEquals("game.example.com", provider.bindings[4]);
        assertEquals(27961, provider.bindings[5]);
    }

    private static final class RecordingProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private int executeCount;
        private String sql;
        private Object[] bindings;

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            executeCount++;
            sql = context.sql();
            bindings = context.bindings();
            return new MockResult[]{new MockResult(1, dsl.newResult())};
        }
    }
}
