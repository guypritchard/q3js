package com.q3js.master.ban.repository;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BanRepositoryTest {
    private static final Field<String> IP_ADDRESS = DSL.field(DSL.name("player_addresses", "ip_address"), String.class);
    private static final Field<OffsetDateTime> BANNED_AT =
        DSL.field(DSL.name("player_addresses", "banned_at"), OffsetDateTime.class);

    @Test
    void returnsBannedAddressesNewestFirst() {
        var provider = new BanProvider();
        var repository = new BanRepository(DSL.using(new MockConnection(provider), SQLDialect.POSTGRES));

        var bans = repository.findAll();

        assertEquals(1, bans.size());
        assertEquals("2001:db8::7", bans.get(0).ipAddress());
        assertTrue(provider.sql.toLowerCase().contains("where"));
        assertTrue(provider.sql.toLowerCase().contains("banned_at"));
    }

    @Test
    void bansAnAddressInThePlayerAddressRecord() {
        var provider = new BanProvider();
        var repository = new BanRepository(DSL.using(new MockConnection(provider), SQLDialect.POSTGRES));

        var ban = repository.ban("2001:db8::7");

        assertEquals("2001:db8::7", ban.ipAddress());
        assertTrue(provider.sql.toLowerCase().contains("insert into \"player_addresses\""));
        assertTrue(provider.sql.toLowerCase().contains("on conflict"));
    }

    @Test
    void unbansWithoutDeletingThePlayerAddress() {
        var provider = new BanProvider();
        var repository = new BanRepository(DSL.using(new MockConnection(provider), SQLDialect.POSTGRES));

        repository.unban("203.0.113.7");

        assertTrue(provider.sql.toLowerCase().contains("update \"player_addresses\""));
        assertEquals("203.0.113.7", provider.bindings[1]);
    }

    private static final class BanProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private String sql;
        private Object[] bindings;

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            sql = context.sql();
            bindings = context.bindings();
            var result = dsl.newResult(IP_ADDRESS, BANNED_AT);
            result.add(dsl.newRecord(IP_ADDRESS, BANNED_AT).values(
                "2001:db8::7",
                OffsetDateTime.parse("2026-08-09T20:00:00Z")
            ));
            return new MockResult[]{new MockResult(1, result)};
        }
    }
}
