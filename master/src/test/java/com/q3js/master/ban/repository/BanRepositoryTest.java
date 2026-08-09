package com.q3js.master.ban.repository;

import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static com.q3js.master.database.generated.Tables.BANNED_IPS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BanRepositoryTest {
    @Test
    void returnsStoredBansNewestFirst() {
        var provider = new BanProvider();
        var repository = new BanRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );

        var bans = repository.findAll();

        assertEquals(1, bans.size());
        assertEquals("2001:db8::7", bans.get(0).ipAddress());
        assertEquals("^1Ranger", bans.get(0).playerName());
        assertTrue(provider.sql.toLowerCase().contains("order by"));
        assertTrue(provider.sql.toLowerCase().contains("banned_at"));
    }

    @Test
    void upsertsBansByIpAddress() {
        var provider = new BanProvider();
        var repository = new BanRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );

        var ban = repository.upsert("2001:db8::7", "^1Ranger");

        assertEquals("2001:db8::7", ban.ipAddress());
        assertEquals("^1Ranger", ban.playerName());
        assertTrue(provider.sql.toLowerCase().contains("insert into"));
        assertTrue(provider.sql.toLowerCase().contains("on conflict"));
    }

    @Test
    void deletesBansByIpAddress() {
        var provider = new BanProvider();
        var repository = new BanRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );

        repository.delete("203.0.113.7");

        assertTrue(provider.sql.toLowerCase().contains("delete from"));
        assertEquals("203.0.113.7", provider.bindings[0]);
    }

    private static final class BanProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private String sql;
        private Object[] bindings;

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            sql = context.sql();
            bindings = context.bindings();
            var result = dsl.newResult(BANNED_IPS.fields());
            result.add(dsl.newRecord(
                BANNED_IPS.IP_ADDRESS,
                BANNED_IPS.PLAYER_NAME,
                BANNED_IPS.BANNED_AT
            ).values(
                "2001:db8::7",
                "^1Ranger",
                OffsetDateTime.parse("2026-08-09T20:00:00Z")
            ));
            return new MockResult[]{new MockResult(1, result)};
        }
    }
}
