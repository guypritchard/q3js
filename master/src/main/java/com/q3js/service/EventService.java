package com.q3js.service;

import com.q3js.service.dto.CreateEventRequest;
import com.q3js.service.dto.KillDistributionPointResponse;
import com.q3js.service.dto.PlayerFavoriteMapResponse;
import com.q3js.service.dto.PlayerFavoriteWeaponResponse;
import com.q3js.service.dto.PlayerStatsResponse;
import com.q3js.service.dto.PlayerVersusStatResponse;
import com.q3js.service.dto.PlayerWeaponBreakdownResponse;
import com.q3js.service.dto.ScoreboardEntryResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.DSL;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static com.q3js.jooq.Tables.EVENTS;

@ApplicationScoped
@RequiredArgsConstructor
public class EventService {
    private final DSLContext dsl;

    @Transactional
    public void ingestEvent(CreateEventRequest createEventRequest) {
        var event = dsl.newRecord(EVENTS);
        var eventType = createEventRequest.getEvent();

        event.setEventType(eventType);
        event.setGameTime(createEventRequest.getGameTime());
        event.setServerTime(createEventRequest.getServerTime());
        event.setMapName(createEventRequest.getMap());

        if ("join".equalsIgnoreCase(eventType) || "leave".equalsIgnoreCase(eventType)) {
            var player = createEventRequest.getPlayer();
            event.setKillerClientNum(player.getClientNum());
            event.setKillerName(player.getName());
            event.setVictimClientNum(null);
            event.setVictimName(null);
            event.setMeansOfDeath(null);
        } else {
            event.setKillerClientNum(createEventRequest.getKiller().getClientNum());
            event.setKillerName(createEventRequest.getKiller().getName());
            event.setVictimClientNum(createEventRequest.getVictim().getClientNum());
            event.setVictimName(createEventRequest.getVictim().getName());
            event.setMeansOfDeath(createEventRequest.getMeansOfDeath());
        }

        event.store();
    }

    public List<ScoreboardEntryResponse> getGlobalScoreboard(ScoreboardPeriod period) {
        OffsetDateTime now = OffsetDateTime.now();
        Field<Integer> kills = DSL.count().as("kills");
        Condition condition = killCondition(period, now);

        return dsl.select(EVENTS.KILLER_NAME, kills)
                .from(EVENTS)
                .where(condition)
                .groupBy(EVENTS.KILLER_NAME)
                .orderBy(kills.desc(), EVENTS.KILLER_NAME.asc())
                .fetch(record -> ScoreboardEntryResponse.builder()
                        .playerName(record.get(EVENTS.KILLER_NAME))
                        .kills(record.get(kills))
                        .build());
    }

    public List<KillDistributionPointResponse> getKillDistribution(ScoreboardPeriod period) {
        OffsetDateTime now = OffsetDateTime.now();
        Field<Integer> kills = DSL.count().as("kills");

        if (period == ScoreboardPeriod.DAILY) {
            OffsetDateTime dayStart = period.startsAt(now).orElseThrow();
            Field<LocalDateTime> hour = DSL
                    .field("date_trunc('hour', timezone('UTC', {0}))", SQLDataType.LOCALDATETIME, EVENTS.RECEIVED_AT)
                    .as("bucket");

            Map<LocalDateTime, Integer> killsByHour = dsl.select(hour, kills)
                    .from(EVENTS)
                    .where(killCondition(period, now))
                    .groupBy(hour)
                    .orderBy(hour.asc())
                    .fetchMap(hour, kills);

            return IntStream.range(0, 24)
                    .mapToObj(index -> {
                        OffsetDateTime bucketStart = dayStart.plusHours(index);
                        return KillDistributionPointResponse.builder()
                                .bucketStart(bucketStart.toString())
                                .kills(killsByHour.getOrDefault(bucketStart.toLocalDateTime(), 0))
                                .build();
                    })
                    .toList();
        }

        Field<LocalDate> day = DSL
                .field("timezone('UTC', {0})::date", SQLDataType.LOCALDATE, EVENTS.RECEIVED_AT)
                .as("bucket");

        return dsl.select(day, kills)
                .from(EVENTS)
                .where(killCondition(period, now))
                .groupBy(day)
                .orderBy(day.asc())
                .fetch(record -> {
                    LocalDate bucket = record.get(day);
                    return KillDistributionPointResponse.builder()
                            .bucketStart(bucket != null ? bucket.toString() : null)
                            .kills(record.get(kills))
                            .build();
                });
    }

    public PlayerStatsResponse getPlayerStats(String playerName, ScoreboardPeriod period) {
        OffsetDateTime now = OffsetDateTime.now();
        Condition baseCondition = killCondition(period, now);
        Condition killedByPlayer = baseCondition.and(EVENTS.KILLER_NAME.eq(playerName));
        Condition killedPlayer = baseCondition.and(EVENTS.VICTIM_NAME.eq(playerName));
        int kills = countEvents(killedByPlayer);
        int deaths = countEvents(killedPlayer);
        List<PlayerWeaponBreakdownResponse> weaponBreakdown = fetchWeaponBreakdown(killedByPlayer);

        return PlayerStatsResponse.builder()
                .playerName(playerName)
                .period(period)
                .playtimeSeconds(fetchPlaytimeSeconds(playerName, period, now))
                .rank(fetchRank(playerName, baseCondition, kills))
                .kills(kills)
                .deaths(deaths)
                .killDeathRatio(calculateKillDeathRatio(kills, deaths))
                .favoriteMap(fetchFavoriteMap(killedByPlayer))
                .favoriteWeapon(toFavoriteWeapon(weaponBreakdown))
                .weaponBreakdown(weaponBreakdown)
                .topVictims(fetchTopVictims(playerName, killedByPlayer))
                .topNemeses(fetchTopNemeses(playerName, killedPlayer))
                .build();
    }

    protected long fetchPlaytimeSeconds(String playerName, ScoreboardPeriod period, OffsetDateTime now) {
        var periodStart = period.startsAt(now).orElse(null);
        Map<String, Deque<OffsetDateTime>> openSessionsBySource = new HashMap<>();
        long totalSeconds = 0;

        var lifecycleEvents = dsl.select(EVENTS.SOURCE_IP, EVENTS.EVENT_TYPE, EVENTS.RECEIVED_AT)
                .from(EVENTS)
                .where(EVENTS.KILLER_NAME.eq(playerName))
                .and(EVENTS.EVENT_TYPE.in("join", "leave"))
                .orderBy(EVENTS.RECEIVED_AT.asc())
                .fetch();

        for (var lifecycleEvent : lifecycleEvents) {
            String sourceIp = lifecycleEvent.get(EVENTS.SOURCE_IP);
            String sourceKey = sourceIp != null ? sourceIp : "";
            Deque<OffsetDateTime> openSessions = openSessionsBySource.computeIfAbsent(sourceKey, ignored -> new ArrayDeque<>());
            OffsetDateTime receivedAt = lifecycleEvent.get(EVENTS.RECEIVED_AT);

            if ("join".equalsIgnoreCase(lifecycleEvent.get(EVENTS.EVENT_TYPE))) {
                openSessions.addLast(receivedAt);
                continue;
            }

            OffsetDateTime joinedAt = openSessions.pollFirst();
            if (joinedAt != null) {
                totalSeconds += overlapSeconds(joinedAt, receivedAt, periodStart, now);
            }
        }

        for (Deque<OffsetDateTime> openSessions : openSessionsBySource.values()) {
            for (OffsetDateTime joinedAt : openSessions) {
                totalSeconds += overlapSeconds(joinedAt, now, periodStart, now);
            }
        }

        return totalSeconds;
    }

    private long overlapSeconds(
            OffsetDateTime sessionStart,
            OffsetDateTime sessionEnd,
            OffsetDateTime periodStart,
            OffsetDateTime periodEnd
    ) {
        OffsetDateTime overlapStart = periodStart != null && sessionStart.isBefore(periodStart) ? periodStart : sessionStart;
        OffsetDateTime overlapEnd = sessionEnd.isAfter(periodEnd) ? periodEnd : sessionEnd;

        if (!overlapEnd.isAfter(overlapStart)) {
            return 0;
        }

        return java.time.Duration.between(overlapStart, overlapEnd).getSeconds();
    }

    private Condition killCondition(ScoreboardPeriod period, OffsetDateTime now) {
        Condition condition = EVENTS.EVENT_TYPE.equalIgnoreCase("kill");
        var periodStart = period.startsAt(now);

        if (periodStart.isPresent()) {
            condition = condition.and(EVENTS.RECEIVED_AT.ge(periodStart.orElseThrow()));
        }

        return condition;
    }

    private int countEvents(Condition condition) {
        Integer count = dsl.selectCount()
                .from(EVENTS)
                .where(condition)
                .fetchOne(0, int.class);
        return count != null ? count : 0;
    }

    private Integer fetchRank(String playerName, Condition condition, int kills) {
        if (kills == 0) {
            return null;
        }

        Field<Integer> groupedKills = DSL.count().as("kills");
        Table<?> leaderboard = dsl.select(
                        EVENTS.KILLER_NAME.as("player_name"),
                        groupedKills
                )
                .from(EVENTS)
                .where(condition)
                .groupBy(EVENTS.KILLER_NAME)
                .asTable("leaderboard");
        Field<String> leaderboardPlayer = DSL.field(DSL.name("leaderboard", "player_name"), String.class);
        Field<Integer> leaderboardKills = DSL.field(DSL.name("leaderboard", "kills"), Integer.class);
        Integer playersAhead = dsl.selectCount()
                .from(leaderboard)
                .where(
                        leaderboardKills.gt(kills)
                                .or(leaderboardKills.eq(kills).and(leaderboardPlayer.lt(playerName)))
                )
                .fetchOne(0, int.class);

        return (playersAhead != null ? playersAhead : 0) + 1;
    }

    private PlayerFavoriteMapResponse fetchFavoriteMap(Condition condition) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.MAP_NAME, kills)
                .from(EVENTS)
                .where(condition)
                .groupBy(EVENTS.MAP_NAME)
                .orderBy(kills.desc(), EVENTS.MAP_NAME.asc())
                .limit(1)
                .fetchOne(record -> PlayerFavoriteMapResponse.builder()
                        .mapName(record.get(EVENTS.MAP_NAME))
                        .kills(valueOrZero(record.get(kills)))
                        .build());
    }

    protected List<PlayerWeaponBreakdownResponse> fetchWeaponBreakdown(Condition condition) {
        Field<Integer> meansOfDeathField = DSL.field("means_of_death", Integer.class);
        Field<Integer> kills = DSL.count().as("kills");
        Map<Integer, Integer> killsByWeapon = new HashMap<>();

        dsl.select(meansOfDeathField, kills)
                .from(EVENTS)
                .where(condition)
                .groupBy(meansOfDeathField)
                .fetch(record -> {
                    Integer meansOfDeath = record.get(meansOfDeathField);
                    if (meansOfDeath == null) {
                        return null;
                    }

                    int normalizedMeansOfDeath = normalizeMeansOfDeath(meansOfDeath);
                    killsByWeapon.merge(normalizedMeansOfDeath, valueOrZero(record.get(kills)), Integer::sum);
                    return null;
                });

        return killsByWeapon.entrySet()
                .stream()
                .sorted(
                        Comparator.<Map.Entry<Integer, Integer>>comparingInt(Map.Entry::getValue)
                                .reversed()
                                .thenComparingInt(Map.Entry::getKey)
                )
                .map(entry -> PlayerWeaponBreakdownResponse.builder()
                        .meansOfDeath(entry.getKey())
                        .weaponName(meansOfDeathName(entry.getKey()))
                        .kills(entry.getValue())
                        .build())
                .toList();
    }

    private PlayerFavoriteWeaponResponse toFavoriteWeapon(List<PlayerWeaponBreakdownResponse> weaponBreakdown) {
        PlayerWeaponBreakdownResponse favoriteWeapon = weaponBreakdown.isEmpty() ? null : weaponBreakdown.getFirst();
        if (favoriteWeapon == null) {
            return null;
        }

        return PlayerFavoriteWeaponResponse.builder()
                .meansOfDeath(favoriteWeapon.getMeansOfDeath())
                .weaponName(favoriteWeapon.getWeaponName())
                .kills(favoriteWeapon.getKills())
                .build();
    }

    private int normalizeMeansOfDeath(int meansOfDeath) {
        return switch (meansOfDeath) {
            case 5 -> 4;
            case 7 -> 6;
            case 9 -> 8;
            case 13 -> 12;
            default -> meansOfDeath;
        };
    }

    private List<PlayerVersusStatResponse> fetchTopVictims(String playerName, Condition condition) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.VICTIM_NAME, kills)
                .from(EVENTS)
                .where(condition.and(EVENTS.VICTIM_NAME.ne(playerName)))
                .groupBy(EVENTS.VICTIM_NAME)
                .orderBy(kills.desc(), EVENTS.VICTIM_NAME.asc())
                .limit(5)
                .fetch(record -> PlayerVersusStatResponse.builder()
                        .playerName(record.get(EVENTS.VICTIM_NAME))
                        .kills(valueOrZero(record.get(kills)))
                        .build());
    }

    private List<PlayerVersusStatResponse> fetchTopNemeses(String playerName, Condition condition) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.KILLER_NAME, kills)
                .from(EVENTS)
                .where(condition.and(EVENTS.KILLER_NAME.ne(playerName)))
                .groupBy(EVENTS.KILLER_NAME)
                .orderBy(kills.desc(), EVENTS.KILLER_NAME.asc())
                .limit(5)
                .fetch(record -> PlayerVersusStatResponse.builder()
                        .playerName(record.get(EVENTS.KILLER_NAME))
                        .kills(valueOrZero(record.get(kills)))
                        .build());
    }

    private Double calculateKillDeathRatio(int kills, int deaths) {
        if (kills == 0 && deaths == 0) {
            return 0.0;
        }
        if (deaths == 0) {
            return null;
        }

        return Math.round(((double) kills / deaths) * 100.0) / 100.0;
    }

    private int valueOrZero(Integer value) {
        return value != null ? value : 0;
    }

    private String meansOfDeathName(int meansOfDeath) {
        return switch (meansOfDeath) {
            case 1 -> "Shotgun";
            case 2 -> "Gauntlet";
            case 3 -> "Machinegun";
            case 4 -> "Grenade Launcher";
            case 5 -> "Grenade Launcher";
            case 6 -> "Rocket Launcher";
            case 7 -> "Rocket Launcher";
            case 8 -> "Plasma Gun";
            case 9 -> "Plasma Gun";
            case 10 -> "Railgun";
            case 11 -> "Lightning Gun";
            case 12 -> "BFG10K";
            case 13 -> "BFG10K";
            case 14 -> "Water";
            case 15 -> "Slime";
            case 16 -> "Lava";
            case 17 -> "Crush";
            case 18 -> "Telefrag";
            case 19 -> "Falling";
            case 20 -> "Suicide";
            case 21 -> "Target Laser";
            case 22 -> "Trigger Hurt";
            case 23 -> "Nailgun";
            case 24 -> "Chaingun";
            case 25 -> "Proximity Mine";
            case 26 -> "Kamikaze";
            case 27 -> "Juiced";
            case 28 -> "Grapple";
            default -> "Unknown (" + meansOfDeath + ")";
        };
    }
}
