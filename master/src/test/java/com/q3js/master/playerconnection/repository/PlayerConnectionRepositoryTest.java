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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlayerConnectionRepositoryTest {
    @Test
    void upsertsAddressesAndNamesForPlayerConnections() throws Exception {
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

        assertEquals(2, provider.sql.size());
        assertTrue(provider.sql.get(0).toLowerCase().contains("insert into \"player_addresses\""));
        assertTrue(provider.sql.get(0).toLowerCase().contains("on conflict"));
        assertEquals("203.0.113.7", provider.bindings.get(0)[0]);
        assertEquals("10.0.0.1", provider.bindings.get(0)[1]);
        assertEquals(
            Map.of("name", "^1Ranger", "rate", "25000"),
            new ObjectMapper().readValue(String.valueOf(provider.bindings.get(0)[2]), Map.class)
        );
        assertEquals("game.example.com", provider.bindings.get(0)[3]);
        assertEquals(27961, provider.bindings.get(0)[4]);

        assertTrue(provider.sql.get(1).toLowerCase().contains("insert into \"player_address_names\""));
        assertEquals("203.0.113.7", provider.bindings.get(1)[0]);
        assertEquals("^1Ranger", provider.bindings.get(1)[1]);
    }

    private static final class RecordingProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final List<String> sql = new ArrayList<>();
        private final List<Object[]> bindings = new ArrayList<>();

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            sql.add(context.sql());
            bindings.add(context.bindings());
            return new MockResult[]{new MockResult(1, dsl.newResult())};
        }
    }
}
