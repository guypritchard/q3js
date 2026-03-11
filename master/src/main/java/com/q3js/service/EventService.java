package com.q3js.service;

import com.q3js.service.dto.KillDistributionPointResponse;
import com.q3js.service.dto.CreateEventRequest;
import com.q3js.service.dto.ScoreboardEntryResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.DSL;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static com.q3js.jooq.Tables.EVENTS;

@ApplicationScoped
@RequiredArgsConstructor
public class EventService {
    private final DSLContext dsl;

    @Transactional
    public void ingestEvent(CreateEventRequest createEventRequest) {
        var event = dsl.newRecord(EVENTS);
        event.setEventType(createEventRequest.getEvent());
        event.setGameTime(createEventRequest.getGameTime());
        event.setKillerClientNum(createEventRequest.getKiller().getClientNum());
        event.setKillerName(createEventRequest.getKiller().getName());
        event.setMeansOfDeath(createEventRequest.getMeansOfDeath());
        event.setMapName(createEventRequest.getMap());
        event.setServerTime(createEventRequest.getServerTime());
        event.setVictimClientNum(createEventRequest.getVictim().getClientNum());
        event.setVictimName(createEventRequest.getVictim().getName());
        event.store();
    }

    public List<ScoreboardEntryResponse> getGlobalScoreboard(ScoreboardPeriod period) {
        Field<Integer> kills = DSL.count().as("kills");
        Condition condition = killCondition(period);

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
        Field<Integer> kills = DSL.count().as("kills");

        if (period == ScoreboardPeriod.DAILY) {
            Field<LocalDateTime> hour = DSL
                    .field("date_trunc('hour', timezone('UTC', {0}))", SQLDataType.LOCALDATETIME, EVENTS.RECEIVED_AT)
                    .as("bucket");

            return dsl.select(hour, kills)
                    .from(EVENTS)
                    .where(killCondition(period))
                    .groupBy(hour)
                    .orderBy(hour.asc())
                    .fetch(record -> {
                        LocalDateTime bucket = record.get(hour);
                        return KillDistributionPointResponse.builder()
                                .bucketStart(bucket != null ? bucket.atOffset(ZoneOffset.UTC).toString() : null)
                                .kills(record.get(kills))
                                .build();
                    });
        }

        Field<LocalDate> day = DSL
                .field("timezone('UTC', {0})::date", SQLDataType.LOCALDATE, EVENTS.RECEIVED_AT)
                .as("bucket");

        return dsl.select(day, kills)
                .from(EVENTS)
                .where(killCondition(period))
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

    private Condition killCondition(ScoreboardPeriod period) {
        Condition condition = EVENTS.EVENT_TYPE.equalIgnoreCase("kill");
        var periodStart = period.startsAt(OffsetDateTime.now());

        if (periodStart.isPresent()) {
            condition = condition.and(EVENTS.RECEIVED_AT.ge(periodStart.orElseThrow()));
        }

        return condition;
    }
}
