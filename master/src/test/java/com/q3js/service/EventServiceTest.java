package com.q3js.service;

import com.q3js.service.dto.*;
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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static com.q3js.jooq.Tables.EVENTS;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class EventServiceTest {
    @Test
    void getAllPlayersReturnsDistinctSortedNamesFromLifecycleAndKillEvents() {
        DSLContext dsl = DSL.using(new MockConnection(new AllPlayersMockProvider()), SQLDialect.POSTGRES);
        EventService eventService = new EventService(dsl, new EventPersistenceService(dsl));

        List<PlayerResponse> response = eventService.getAllPlayers();

        assertEquals(
                List.of(
                        PlayerResponse.builder().playerName("Anarki").build(),
                        PlayerResponse.builder().playerName("Ranger").build(),
                        PlayerResponse.builder().playerName("Slash").build(),
                        PlayerResponse.builder().playerName("Visor").build()
                ),
                response
        );
    }

    @Test
    void getPlayerStatsAggregatesProfileData() {
        DSLContext dsl = DSL.using(new MockConnection(new PlayerStatsMockProvider()), SQLDialect.POSTGRES);
        EventService eventService = new TestEventService(
                dsl,
                List.of(
                        PlayerWeaponBreakdownResponse.builder().meansOfDeath(6).weaponName("Rocket Launcher").kills(5).build(),
                        PlayerWeaponBreakdownResponse.builder().meansOfDeath(10).weaponName("Railgun").kills(4).build(),
                        PlayerWeaponBreakdownResponse.builder().meansOfDeath(11).weaponName("Lightning Gun").kills(3).build()
                ),
                5400
        );

        PlayerStatsResponse response = eventService.getPlayerStats("Ranger", ScoreboardPeriod.ALL_TIME, RequestedTimeZone.DEFAULT);

        assertEquals("Ranger", response.getPlayerName());
        assertEquals(ScoreboardPeriod.ALL_TIME, response.getPeriod());
        assertEquals(5400, response.getPlaytimeSeconds());
        assertEquals("2026-03-10T14:15Z", response.getLastOnline());
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
        EventService eventService = new TestEventService(dsl, List.of());

        PlayerStatsResponse response = eventService.getPlayerStats("Sarge", ScoreboardPeriod.DAILY, RequestedTimeZone.DEFAULT);

        assertEquals("Sarge", response.getPlayerName());
        assertEquals(ScoreboardPeriod.DAILY, response.getPeriod());
        assertEquals(0, response.getPlaytimeSeconds());
        assertNull(response.getLastOnline());
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

    @Test
    void ingestEventSupportsActorOnlyEvents() {
        RecordingInsertMockProvider provider = new RecordingInsertMockProvider();
        DSLContext dsl = DSL.using(new MockConnection(provider), SQLDialect.POSTGRES);
        EventService eventService = new EventService(dsl, new EventPersistenceService(dsl));
        eventService.startQueueProcessor();

        try {
            eventService.ingestEvent(CreateEventRequest.builder()
                    .event("join")
                    .player(CreateEventRequest.EventPlayer.builder()
                            .clientNum(4)
                            .name("Ranger")
                            .build())
                    .gameTime(1234)
                    .serverTime(5678)
                    .map("q3dm17")
                    .build());

            waitForInsert(provider.executeCount, 1);

            assertEquals(1, provider.executeCount.get());
            assertArrayEquals(
                    new Object[]{"join", 4, "Ranger", null, null, null, 1234, 5678, "q3dm17"},
                    provider.bindings
            );
        } finally {
            eventService.stopQueueProcessor();
        }
    }

    @Test
    void getKillDistributionUsesRollingHourlyBucketsForDailyPeriod() {
        OffsetDateTime now = OffsetDateTime.of(2026, 3, 11, 15, 42, 0, 0, ZoneOffset.ofHours(1));
        ZoneId timeZone = ZoneId.of("Asia/Tokyo");
        OffsetDateTime dayStart = ScoreboardPeriod.DAILY.startsAt(now, timeZone).orElseThrow();
        DSLContext dsl = DSL.using(new MockConnection(new DailyDistributionMockProvider(
                dayStart.plusMinutes(5).withOffsetSameInstant(ZoneOffset.UTC),
                dayStart.plusHours(1).plusMinutes(1).withOffsetSameInstant(ZoneOffset.UTC),
                dayStart.plusHours(1).plusMinutes(45).withOffsetSameInstant(ZoneOffset.UTC),
                now.minusMinutes(1).withOffsetSameInstant(ZoneOffset.UTC)
        )), SQLDialect.POSTGRES);
        EventService eventService = new FixedNowEventService(dsl, now);

        var response = eventService.getKillDistribution(ScoreboardPeriod.DAILY, timeZone);

        assertEquals(24, response.size());
        assertEquals(dayStart.toString(), response.getFirst().getBucketStart());
        assertEquals(1, response.getFirst().getKills());
        assertEquals(dayStart.plusHours(1).toString(), response.get(1).getBucketStart());
        assertEquals(2, response.get(1).getKills());
        assertEquals(1, response.getLast().getKills());
        assertEquals(4, response.stream().mapToInt(point -> point.getKills() != null ? point.getKills() : 0).sum());
    }

    @Test
    void getKillDistributionReturnsLocalMidnightBucketsForCalendarPeriods() {
        DSLContext dsl = DSL.using(new MockConnection(new CalendarDistributionMockProvider()), SQLDialect.POSTGRES);
        EventService eventService = new FixedNowEventService(
                dsl,
                OffsetDateTime.of(2026, 3, 11, 15, 42, 0, 0, ZoneOffset.UTC)
        );

        var response = eventService.getKillDistribution(ScoreboardPeriod.WEEKLY, ZoneId.of("America/New_York"));

        assertEquals(2, response.size());
        assertEquals("2026-03-09T00:00-04:00", response.getFirst().getBucketStart());
        assertEquals(3, response.getFirst().getKills());
        assertEquals("2026-03-10T00:00-04:00", response.get(1).getBucketStart());
        assertEquals(5, response.get(1).getKills());
    }

    private static final class PlayerStatsMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final AtomicInteger callIndex = new AtomicInteger();

        @Override
        public MockResult[] execute(MockExecuteContext context) throws SQLException {
            return switch (callIndex.getAndIncrement()) {
                case 0 -> new MockResult[]{new MockResult(1, countResult(12))};
                case 1 -> new MockResult[]{new MockResult(1, countResult(5))};
                case 2 -> new MockResult[]{new MockResult(1, lastOnlineResult(OffsetDateTime.parse("2026-03-10T14:15:00Z")))};
                case 3 -> new MockResult[]{new MockResult(1, countResult(1))};
                case 4 -> new MockResult[]{new MockResult(1, favoriteMapResult("q3dm17", 7))};
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

        private Result<?> lastOnlineResult(OffsetDateTime lastOnline) {
            Field<OffsetDateTime> lastOnlineField = DSL.field("last_online", OffsetDateTime.class);
            var result = dsl.newResult(lastOnlineField);
            result.add(dsl.newRecord(lastOnlineField).values(lastOnline));
            return result;
        }

        private Result<?> versusVictimsResult() {
            Field<Integer> killsField = DSL.field("kills", Integer.class);
            var result = dsl.newResult(EVENTS.VICTIM_NAME, killsField);
            result.add(dsl.newRecord(EVENTS.VICTIM_NAME, killsField).values("Slash", 6));
            result.add(dsl.newRecord(EVENTS.VICTIM_NAME, killsField).values("Keel", 4));
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
                case 2 -> new MockResult[]{new MockResult(0, emptyLastOnlineResult())};
                case 3 -> new MockResult[]{new MockResult(0, emptyResult(EVENTS.MAP_NAME, DSL.field("kills", Integer.class)))};
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

        private Result<?> emptyLastOnlineResult() {
            return dsl.newResult(DSL.field("last_online", OffsetDateTime.class));
        }
    }

    private static final class RecordingInsertMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private Object[] bindings;
        private final AtomicInteger executeCount = new AtomicInteger();

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            bindings = context.bindings();
            executeCount.incrementAndGet();
            return new MockResult[]{new MockResult(1, dsl.newResult(EVENTS.fields()))};
        }
    }

    private static final class AllPlayersMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            Field<String> playerName = DSL.field(DSL.name("players", "player_name"), String.class);
            var result = dsl.newResult(playerName);
            result.add(dsl.newRecord(playerName).values("Anarki"));
            result.add(dsl.newRecord(playerName).values("Ranger"));
            result.add(dsl.newRecord(playerName).values("Slash"));
            result.add(dsl.newRecord(playerName).values("Visor"));

            return new MockResult[]{new MockResult(result.size(), result)};
        }
    }

    private static final class DailyDistributionMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final OffsetDateTime[] receivedAtValues;

        private DailyDistributionMockProvider(OffsetDateTime... receivedAtValues) {
            this.receivedAtValues = receivedAtValues;
        }

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            var result = dsl.newResult(EVENTS.RECEIVED_AT);

            for (OffsetDateTime receivedAtValue : receivedAtValues) {
                result.add(dsl.newRecord(EVENTS.RECEIVED_AT).values(receivedAtValue));
            }

            return new MockResult[]{new MockResult(receivedAtValues.length, result)};
        }
    }

    private static final class CalendarDistributionMockProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            Field<LocalDate> bucketField = DSL.field("bucket", LocalDate.class);
            Field<Integer> killsField = DSL.field("kills", Integer.class);
            var result = dsl.newResult(bucketField, killsField);
            result.add(dsl.newRecord(bucketField, killsField).values(LocalDate.of(2026, 3, 9), 3));
            result.add(dsl.newRecord(bucketField, killsField).values(LocalDate.of(2026, 3, 10), 5));
            return new MockResult[]{new MockResult(result.size(), result)};
        }
    }

    private static final class TestEventService extends EventService {
        private final long playtimeSeconds;
        private final List<PlayerWeaponBreakdownResponse> weaponBreakdown;

        private TestEventService(DSLContext dsl, List<PlayerWeaponBreakdownResponse> weaponBreakdown) {
            this(dsl, weaponBreakdown, 0);
        }

        private TestEventService(DSLContext dsl, List<PlayerWeaponBreakdownResponse> weaponBreakdown, long playtimeSeconds) {
            super(dsl, new EventPersistenceService(dsl));
            this.weaponBreakdown = weaponBreakdown;
            this.playtimeSeconds = playtimeSeconds;
        }

        @Override
        protected List<PlayerWeaponBreakdownResponse> fetchWeaponBreakdown(org.jooq.Condition condition) {
            return weaponBreakdown;
        }

        @Override
        protected long fetchPlaytimeSeconds(String playerName, ScoreboardPeriod period, java.time.OffsetDateTime now, ZoneId timeZone) {
            return playtimeSeconds;
        }
    }

    private static final class FixedNowEventService extends EventService {
        private final OffsetDateTime now;

        private FixedNowEventService(DSLContext dsl, OffsetDateTime now) {
            super(dsl, new EventPersistenceService(dsl));
            this.now = now;
        }

        @Override
        protected OffsetDateTime currentTime() {
            return now;
        }
    }

    private static void waitForInsert(AtomicInteger executeCount, int expectedCount) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (System.nanoTime() < deadline) {
            if (executeCount.get() >= expectedCount) {
                return;
            }

            try {
                TimeUnit.MILLISECONDS.sleep(10);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for queued event persistence", interruptedException);
            }
        }

        assertEquals(expectedCount, executeCount.get());
    }
}
