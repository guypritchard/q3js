package com.q3js.service;

import com.q3js.service.dto.CreateEventRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;

import static com.q3js.jooq.Tables.EVENTS;

@ApplicationScoped
@RequiredArgsConstructor
public class EventService {
    private final DSLContext dsl;

    @Transactional
    public void ingestEvent(CreateEventRequest createEventRequest) {
        var event = dsl.newRecord(EVENTS);
        event.setEventType(event.getEventType());
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
}
