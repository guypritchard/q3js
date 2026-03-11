package com.q3js.service;

import com.q3js.service.dto.PlayerStatsResponse;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Result;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.concurrent.atomic.AtomicInteger;

import static com.q3js.jooq.Tables.EVENTS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class EventServiceTest {
    @Test
    void getPlayerStatsAggregatesProfileData() {
        DSLContext dsl = DSL.using(new MockConnection(new PlayerStatsMockProvider()), SQLDialect.POSTGRES);
        EventService eventService = new EventService(dsl);

        PlayerStatsResponse response = eventService.getPlayerStats("Ranger", ScoreboardPeriod.ALL_TIME);

        assertEquals("Ranger", response.getPlayerName());
        assertEquals(ScoreboardPeriod.ALL_TIME, response.getPeriod());
        assertEquals(2, response.getRank());
        assertEquals(12, response.getKills());
        assertEquals(5, response.getDeaths());
        assertEquals(2.4, response.getKillDeathRatio());
        assertEquals("q3dm17", response.getFavoriteMap().getMapName());
        assertEquals(7, response.getFavoriteMap().getKills());
        assertEquals(6, response.getFavoriteWeapon().getMeansOfDeath());
        assertEquals("Rocket Launcher", response.getFavoriteWeapon().getWeaponName());
        assertEquals(5, response.getFavoriteWeapon().getKills());
        assertEquals(3, response.getWeaponBreakdown().size());
        assertEquals("Rocket Launcher", response.getWeaponBreakdown().getFirst().getWeaponName());
        assertEquals(5, response.getWeaponBreakdown().getFirst().getKills());
        assertEquals("Railgun", response.getWeaponBreakdown().get(1).getWeaponName());
        assertEquals(4, response.getWeaponBreakdown().get(1).getKills());
        assertEquals(2, response.getTopVictims().size());
        assertEquals("Slash", response.getTopVictims().getFirst().getPlayerName());
        assertEquals(6, response.getTopVictims().getFirst().getKills());
        assertEquals(2, response.getTopNemeses().size());
        assertEquals("Visor", response.getTopNemeses().getFirst().getPlayerName());
        assertEquals(3, response.getTopNemeses().getFirst().getKills());
    }

    @Test
    void getPlayerStatsReturnsNullRankAndPerfectKdWhenPlayerHasNoDeaths() {
        DSLContext dsl = DSL.using(new MockConnection(new EmptyPlayerStatsMockProvider()), SQLDialect.POSTGRES);
        EventService eventService = new EventService(dsl);

        PlayerStatsResponse response = eventService.getPlayerStats("Sarge", ScoreboardPeriod.DAILY);

        assertEquals("Sarge", response.getPlayerName());
        assertEquals(ScoreboardPeriod.DAILY, response.getPeriod());
        assertNull(response.getRank());
        assertEquals(0, response.getKills());
        assertEquals(0, response.getDeaths());
        assertEquals(0.0, response.getKillDeathRatio());
        assertNull(response.getFavoriteMap());
        assertNull(response.getFavoriteWeapon());
        assertEquals(0, response.getWeaponBreakdown().size());
        assertEquals(0, response.getTopVictims().size());
        assertEquals(0, response.getTopNemeses().size());
    }

    private static final class PlayerStatsMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final AtomicInteger callIndex = new AtomicInteger();

        @Override
        public MockResult[] execute(MockExecuteContext context) throws SQLException {
            return switch (callIndex.getAndIncrement()) {
                case 0 -> new MockResult[]{new MockResult(1, countResult(12))};
                case 1 -> new MockResult[]{new MockResult(1, countResult(5))};
                case 2 -> new MockResult[]{new MockResult(1, countResult(1))};
                case 3 -> new MockResult[]{new MockResult(1, favoriteMapResult("q3dm17", 7))};
                case 4 -> new MockResult[]{new MockResult(4, weaponBreakdownResult())};
                case 5 -> new MockResult[]{new MockResult(2, versusVictimsResult())};
                case 6 -> new MockResult[]{new MockResult(2, versusNemesesResult())};
                default -> throw new SQLException("Unexpected query call " + callIndex.get());
            };
        }

        private Result<?> countResult(int count) {
            Field<Integer> field = DSL.field("count", Integer.class);
            var result = dsl.newResult(field);
            result.add(dsl.newRecord(field).values(count));
            return result;
        }

        private Result<?> favoriteMapResult(String mapName, int kills) {
            Field<Integer> killsField = DSL.field("kills", Integer.class);
            var result = dsl.newResult(EVENTS.MAP_NAME, killsField);
            result.add(dsl.newRecord(EVENTS.MAP_NAME, killsField).values(mapName, kills));
            return result;
        }

        private Result<?> versusVictimsResult() {
            Field<Integer> killsField = DSL.field("kills", Integer.class);
            var result = dsl.newResult(EVENTS.VICTIM_NAME, killsField);
            result.add(dsl.newRecord(EVENTS.VICTIM_NAME, killsField).values("Slash", 6));
            result.add(dsl.newRecord(EVENTS.VICTIM_NAME, killsField).values("Keel", 4));
            return result;
        }

        private Result<?> weaponBreakdownResult() {
            Field<Integer> killsField = DSL.field("kills", Integer.class);
            var result = dsl.newResult(EVENTS.MEANS_OF_DEATH, killsField);
            result.add(dsl.newRecord(EVENTS.MEANS_OF_DEATH, killsField).values(6, 4));
            result.add(dsl.newRecord(EVENTS.MEANS_OF_DEATH, killsField).values(7, 1));
            result.add(dsl.newRecord(EVENTS.MEANS_OF_DEATH, killsField).values(10, 4));
            result.add(dsl.newRecord(EVENTS.MEANS_OF_DEATH, killsField).values(11, 3));
            return result;
        }

        private Result<?> versusNemesesResult() {
            Field<Integer> killsField = DSL.field("kills", Integer.class);
            var result = dsl.newResult(EVENTS.KILLER_NAME, killsField);
            result.add(dsl.newRecord(EVENTS.KILLER_NAME, killsField).values("Visor", 3));
            result.add(dsl.newRecord(EVENTS.KILLER_NAME, killsField).values("Xaero", 2));
            return result;
        }
    }

    private static final class EmptyPlayerStatsMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final AtomicInteger callIndex = new AtomicInteger();

        @Override
        public MockResult[] execute(MockExecuteContext context) throws SQLException {
            return switch (callIndex.getAndIncrement()) {
                case 0 -> new MockResult[]{new MockResult(1, countResult(0))};
                case 1 -> new MockResult[]{new MockResult(1, countResult(0))};
                case 2 -> new MockResult[]{new MockResult(0, emptyResult(EVENTS.MAP_NAME, DSL.field("kills", Integer.class)))};
                case 3 -> new MockResult[]{new MockResult(0, emptyResult(EVENTS.MEANS_OF_DEATH, DSL.field("kills", Integer.class)))};
                case 4 -> new MockResult[]{new MockResult(0, emptyResult(EVENTS.VICTIM_NAME, DSL.field("kills", Integer.class)))};
                case 5 -> new MockResult[]{new MockResult(0, emptyResult(EVENTS.KILLER_NAME, DSL.field("kills", Integer.class)))};
                default -> throw new SQLException("Unexpected query call " + callIndex.get());
            };
        }

        private Result<?> countResult(int count) {
            Field<Integer> field = DSL.field("count", Integer.class);
            var result = dsl.newResult(field);
            result.add(dsl.newRecord(field).values(count));
            return result;
        }

        private Result<?> emptyResult(Field<?> first, Field<?> second) {
            return dsl.newResult(first, second);
        }
    }
}
