package com.q3js.service;

import com.q3js.service.dto.*;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.DSL;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.IntStream;

import static com.q3js.jooq.Tables.EVENTS;

@ApplicationScoped
@RequiredArgsConstructor
public class EventService {
    private static final Logger LOG = Logger.getLogger(EventService.class);

    private final DSLContext dsl;
    private final EventPersistenceService eventPersistenceService;
    private static final int MAX_QUEUE_SIZE = 10_000;
    private final LinkedBlockingQueue<QueuedEvent> eventQueue = new LinkedBlockingQueue<>(MAX_QUEUE_SIZE);
    private final AtomicBoolean running = new AtomicBoolean();

    private ExecutorService eventProcessor;

    @PostConstruct
    void startQueueProcessor() {
        running.set(true);
        eventProcessor = Executors.newSingleThreadExecutor(Thread.ofPlatform()
                .name("event-processor-", 0)
                .factory());
        eventProcessor.submit(this::processQueuedEvents);
    }

    @PreDestroy
    void stopQueueProcessor() {
        running.set(false);

        if (eventProcessor == null) {
            return;
        }

        eventProcessor.shutdown();
        try {
            if (!eventProcessor.awaitTermination(5, TimeUnit.SECONDS)) {
                eventProcessor.shutdownNow();
                LOG.warnf("Event processor stopped with %d events still queued", eventQueue.size());
            }
        } catch (InterruptedException interruptedException) {
            eventProcessor.shutdownNow();
            Thread.currentThread().interrupt();
            LOG.warn("Interrupted while waiting for event processor shutdown", interruptedException);
        }
    }

    public boolean ingestEvent(CreateEventRequest createEventRequest) {
        boolean accepted = eventQueue.offer(QueuedEvent.from(createEventRequest));
        if (!accepted) {
            LOG.warnf("Dropping event because queue is full. size=%d", eventQueue.size());
        }

        if (eventQueue.size() > 5_000) {
            LOG.warnf("Event queue backlog is high: %d", eventQueue.size());
        }

        return accepted;
    }

    private void processQueuedEvents() {
        while (running.get() || !eventQueue.isEmpty()) {
            try {
                QueuedEvent queuedEvent = eventQueue.poll(250, TimeUnit.MILLISECONDS);
                if (queuedEvent == null) {
                    continue;
                }

                eventPersistenceService.persist(queuedEvent);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                if (running.get()) {
                    LOG.warn("Event processor interrupted unexpectedly", interruptedException);
                }
                break;
            } catch (Exception exception) {
                LOG.error("Failed to persist queued event", exception);
            }
        }
    }

    public List<PlayerResponse> getAllPlayers() {
        Field<String> playerName = DSL.field(DSL.name("players", "player_name"), String.class);
        Table<?> players = dsl.select(EVENTS.KILLER_NAME.as("player_name"))
                .from(EVENTS)
                .where(EVENTS.KILLER_NAME.isNotNull())
                .union(
                        dsl.select(EVENTS.VICTIM_NAME.as("player_name"))
                                .from(EVENTS)
                                .where(EVENTS.VICTIM_NAME.isNotNull()))
                .asTable("players");

        return dsl.select(playerName)
                .from(players)
                .where(DSL.trim(playerName).ne(""))
                .orderBy(playerName.asc())
                .fetch(name -> PlayerResponse.builder()
                        .playerName(name.get(playerName))
                        .build());
    }

    public ScoreboardPageResponse getPlayerScoreboard(ScoreboardPeriod period, ZoneId timeZone, int page, int pageSize) {
        OffsetDateTime now = currentTime();
        Field<Integer> kills = DSL.count().as("kills");
        Condition condition = killCondition(period, now, timeZone);
        Table<?> scoreboard = dsl.select(
                EVENTS.KILLER_NAME.as("player_name"),
                kills)
                .from(EVENTS)
                .where(condition)
                .groupBy(EVENTS.KILLER_NAME)
                .asTable("scoreboard");
        Table<?> lastOnlineByPlayer = lastOnlineByPlayerTable();
        Field<String> scoreboardPlayer = DSL.field(DSL.name("scoreboard", "player_name"), String.class);
        Field<Integer> scoreboardKills = DSL.field(DSL.name("scoreboard", "kills"), Integer.class);
        Field<String> lastOnlinePlayer = DSL.field(DSL.name("last_online_by_player", "player_name"), String.class);
        Field<OffsetDateTime> lastOnline = DSL.field(DSL.name("last_online_by_player", "last_online"),
                OffsetDateTime.class);
        Integer totalEntriesValue = dsl.selectCount()
                .from(scoreboard)
                .fetchOne(0, Integer.class);
        Integer totalKillsValue = dsl.select(DSL.coalesce(DSL.sum(scoreboardKills), 0))
                .from(scoreboard)
                .fetchOne(0, Integer.class);
        int totalEntries = valueOrZero(totalEntriesValue);
        int totalKills = valueOrZero(totalKillsValue);
        int totalPages = Math.max(1, (int) Math.ceil(totalEntries / (double) pageSize));
        int safePage = Math.min(page, totalPages);
        int offset = (safePage - 1) * pageSize;

        List<ScoreboardEntryResponse> entries = dsl.select(scoreboardPlayer, scoreboardKills, lastOnline)
                .from(scoreboard)
                .leftJoin(lastOnlineByPlayer)
                .on(scoreboardPlayer.eq(lastOnlinePlayer))
                .orderBy(scoreboardKills.desc(), scoreboardPlayer.asc())
                .limit(pageSize)
                .offset(offset)
                .fetch(record -> ScoreboardEntryResponse.builder()
                        .playerName(record.get(scoreboardPlayer))
                        .kills(record.get(scoreboardKills))
                        .lastOnline(record.get(lastOnline) != null ? record.get(lastOnline).toString() : null)
                        .build());

        return ScoreboardPageResponse.builder()
                .period(period)
                .page(safePage)
                .pageSize(pageSize)
                .totalEntries(totalEntries)
                .totalPages(totalPages)
                .totalKills(totalKills)
                .hasPreviousPage(safePage > 1)
                .hasNextPage(safePage < totalPages)
                .entries(entries)
                .build();
    }

    public List<KillDistributionPointResponse> getPlayerScoreboardDistribution(ScoreboardPeriod period, ZoneId timeZone) {
        OffsetDateTime now = currentTime();
        Field<Integer> kills = DSL.count().as("kills");

        if (period == ScoreboardPeriod.DAILY) {
            OffsetDateTime dayStart = period.startsAt(now, timeZone).orElseThrow();
            ZonedDateTime zonedNow = now.atZoneSameInstant(timeZone);
            ZonedDateTime zonedDayStart = dayStart.atZoneSameInstant(timeZone);
            int[] killsByHour = new int[24];

            dsl.select(EVENTS.RECEIVED_AT)
                    .from(EVENTS)
                    .where(killCondition(period, now, timeZone))
                    .orderBy(EVENTS.RECEIVED_AT.asc())
                    .fetch(EVENTS.RECEIVED_AT)
                    .forEach(receivedAt -> {
                        if (receivedAt == null) {
                            return;
                        }

                        ZonedDateTime zonedReceivedAt = receivedAt.atZoneSameInstant(timeZone);
                        int bucketIndex = !zonedReceivedAt.isBefore(zonedNow)
                                ? 23
                                : (int) ChronoUnit.HOURS.between(zonedDayStart, zonedReceivedAt);

                        if (bucketIndex >= 0 && bucketIndex < killsByHour.length) {
                            killsByHour[bucketIndex]++;
                        }
                    });

            return IntStream.range(0, 24)
                    .mapToObj(index -> {
                        OffsetDateTime bucketStart = zonedDayStart.plusHours(index).toOffsetDateTime();
                        return KillDistributionPointResponse.builder()
                                .bucketStart(bucketStart.toString())
                                .kills(killsByHour[index])
                                .build();
                    })
                    .toList();
        }

        Field<LocalDate> day = DSL
                .field("timezone({0}, {1})::date", SQLDataType.LOCALDATE, DSL.inline(timeZone.getId()),
                        EVENTS.RECEIVED_AT)
                .as("bucket");

        return dsl.select(day, kills)
                .from(EVENTS)
                .where(killCondition(period, now, timeZone))
                .groupBy(day)
                .orderBy(day.asc())
                .fetch(record -> {
                    LocalDate bucket = record.get(day);
                    return KillDistributionPointResponse.builder()
                            .bucketStart(
                                    bucket != null ? bucket.atStartOfDay(timeZone).toOffsetDateTime().toString() : null)
                            .kills(record.get(kills))
                            .build();
                })
                ;
    }

    public PlayerStatsResponse getPlayerStats(String playerName, ScoreboardPeriod period, ZoneId timeZone) {
        OffsetDateTime now = currentTime();
        Condition baseCondition = killCondition(period, now, timeZone);
        Condition killedByPlayer = baseCondition.and(EVENTS.KILLER_NAME.eq(playerName));
        Condition killedPlayer = baseCondition.and(EVENTS.VICTIM_NAME.eq(playerName));
        int kills = countEvents(killedByPlayer);
        int deaths = countEvents(killedPlayer);
        List<PlayerWeaponBreakdownResponse> weaponBreakdown = fetchWeaponBreakdown(killedByPlayer);

        return PlayerStatsResponse.builder()
                .playerName(playerName)
                .period(period)
                .playtimeSeconds(fetchPlaytimeSeconds(playerName, period, now, timeZone))
                .lastOnline(fetchLastOnline(playerName))
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

    protected OffsetDateTime currentTime() {
        return OffsetDateTime.now();
    }

    protected long fetchPlaytimeSeconds(String playerName, ScoreboardPeriod period, OffsetDateTime now,
            ZoneId timeZone) {
        var periodStart = period.startsAt(now, timeZone).orElse(null);
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
            Deque<OffsetDateTime> openSessions = openSessionsBySource.computeIfAbsent(sourceKey,
                    ignored -> new ArrayDeque<>());
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

    private String fetchLastOnline(String playerName) {
        OffsetDateTime lastOnline = dsl.select(DSL.max(EVENTS.RECEIVED_AT).as("last_online"))
                .from(EVENTS)
                .where(EVENTS.KILLER_NAME.eq(playerName).or(EVENTS.VICTIM_NAME.eq(playerName)))
                .fetchOne(0, OffsetDateTime.class);
        return lastOnline != null ? lastOnline.toString() : null;
    }

    private Table<?> lastOnlineByPlayerTable() {
        Table<?> playerActivity = dsl.select(
                EVENTS.KILLER_NAME.as("player_name"),
                EVENTS.RECEIVED_AT.as("received_at"))
                .from(EVENTS)
                .where(EVENTS.KILLER_NAME.isNotNull())
                .unionAll(
                        dsl.select(
                                EVENTS.VICTIM_NAME.as("player_name"),
                                EVENTS.RECEIVED_AT.as("received_at"))
                                .from(EVENTS)
                                .where(EVENTS.VICTIM_NAME.isNotNull()))
                .asTable("player_activity");
        Field<String> playerName = DSL.field(DSL.name("player_activity", "player_name"), String.class);
        Field<OffsetDateTime> receivedAt = DSL.field(DSL.name("player_activity", "received_at"), OffsetDateTime.class);

        return dsl.select(
                playerName,
                DSL.max(receivedAt).as("last_online"))
                .from(playerActivity)
                .groupBy(playerName)
                .asTable("last_online_by_player");
    }

    private long overlapSeconds(
            OffsetDateTime sessionStart,
            OffsetDateTime sessionEnd,
            OffsetDateTime periodStart,
            OffsetDateTime periodEnd) {
        OffsetDateTime overlapStart = periodStart != null && sessionStart.isBefore(periodStart) ? periodStart
                : sessionStart;
        OffsetDateTime overlapEnd = sessionEnd.isAfter(periodEnd) ? periodEnd : sessionEnd;

        if (!overlapEnd.isAfter(overlapStart)) {
            return 0;
        }

        return java.time.Duration.between(overlapStart, overlapEnd).getSeconds();
    }

    private Condition killCondition(ScoreboardPeriod period, OffsetDateTime now, ZoneId timeZone) {
        Condition condition = EVENTS.EVENT_TYPE.equalIgnoreCase("kill");
        var periodStart = period.startsAt(now, timeZone);

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
                groupedKills)
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
                                .or(leaderboardKills.eq(kills).and(leaderboardPlayer.lt(playerName))))
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
                                .thenComparingInt(Map.Entry::getKey))
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

    record QueuedEvent(
            String event,
            CreateEventRequest.EventPlayer player,
            CreateEventRequest.EventPlayer killer,
            CreateEventRequest.EventPlayer victim,
            Integer meansOfDeath,
            Integer gameTime,
            Integer serverTime,
            String map) {
        static QueuedEvent from(CreateEventRequest request) {
            return new QueuedEvent(
                    request.getEvent(),
                    copyPlayer(request.getPlayer()),
                    copyPlayer(request.getKiller()),
                    copyPlayer(request.getVictim()),
                    request.getMeansOfDeath(),
                    request.getGameTime(),
                    request.getServerTime(),
                    request.getMap());
        }

        private static CreateEventRequest.EventPlayer copyPlayer(CreateEventRequest.EventPlayer player) {
            if (player == null) {
                return null;
            }

            return CreateEventRequest.EventPlayer.builder()
                    .clientNum(player.getClientNum())
                    .name(player.getName())
                    .build();
        }
    }
}
