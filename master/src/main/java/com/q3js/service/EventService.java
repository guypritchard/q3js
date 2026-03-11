package com.q3js.service;

import com.q3js.service.dto.CreateEventRequest;
import com.q3js.service.dto.ScoreboardEntryResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Condition;
import org.jooq.Field;
import org.jooq.impl.DSL;

import java.time.OffsetDateTime;
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
        Condition condition = EVENTS.EVENT_TYPE.equalIgnoreCase("kill");
        var periodStart = period.startsAt(OffsetDateTime.now());

        if (periodStart.isPresent()) {
            condition = condition.and(EVENTS.RECEIVED_AT.ge(periodStart.orElseThrow()));
        }

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
}
