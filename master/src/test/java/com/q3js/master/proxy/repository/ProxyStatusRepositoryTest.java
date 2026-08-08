package com.q3js.master.proxy.repository;

import com.q3js.master.proxy.domain.ProxyPlayer;
import com.q3js.master.proxy.domain.ProxyStatus;
import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProxyStatusRepositoryTest {
    @Test
    void replacesStatusAndPlayerRows() {
        var provider = new RecordingProvider();
        var repository = new ProxyStatusRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );
        OffsetDateTime receivedAt = OffsetDateTime.parse("2026-08-08T20:00:00Z");

        repository.upsert(new ProxyStatus(
            "game.example.com",
            27961,
            List.of(
                new ProxyPlayer("203.0.113.10", "Ranger", "US"),
                new ProxyPlayer("198.51.100.20", "Sarge", null)
            ),
            3,
            "127.0.0.1",
            receivedAt
        ));

        assertEquals(4, provider.sql.size());
        assertTrue(provider.sql.get(0).contains("insert into \"proxy_statuses\""));
        assertTrue(provider.sql.get(0).contains("on conflict"));
        assertTrue(provider.sql.get(1).contains("delete from \"proxy_status_players\""));
        assertTrue(provider.sql.get(2).contains("insert into \"proxy_status_players\""));
        assertTrue(provider.sql.get(3).contains("insert into \"proxy_status_players\""));
        assertEquals("Ranger", provider.bindings.get(2)[4]);
        assertEquals("US", provider.bindings.get(2)[5]);
        assertEquals("Sarge", provider.bindings.get(3)[4]);
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
