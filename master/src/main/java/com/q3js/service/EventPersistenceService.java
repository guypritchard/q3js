package com.q3js.service;

import com.q3js.service.dto.CreateEventRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;

import static com.q3js.jooq.Tables.EVENTS;

@ApplicationScoped
@RequiredArgsConstructor
public class EventPersistenceService {
    private final DSLContext dsl;

    @Transactional
    public void persist(EventService.QueuedEvent queuedEvent) {
        var event = dsl.newRecord(EVENTS);
        var eventType = queuedEvent.event();

        event.setEventType(eventType);
        event.setGameTime(queuedEvent.gameTime());
        event.setServerTime(queuedEvent.serverTime());
        event.setMapName(queuedEvent.map());

        if ("join".equalsIgnoreCase(eventType) || "leave".equalsIgnoreCase(eventType)) {
            CreateEventRequest.EventPlayer player = queuedEvent.player();
            event.setKillerClientNum(player != null ? player.getClientNum() : null);
            event.setKillerName(player != null ? player.getName() : null);
            event.setVictimClientNum(null);
            event.setVictimName(null);
            event.setMeansOfDeath(null);
        } else {
            CreateEventRequest.EventPlayer killer = queuedEvent.killer();
            CreateEventRequest.EventPlayer victim = queuedEvent.victim();
            event.setKillerClientNum(killer != null ? killer.getClientNum() : null);
            event.setKillerName(killer != null ? killer.getName() : null);
            event.setVictimClientNum(victim != null ? victim.getClientNum() : null);
            event.setVictimName(victim != null ? victim.getName() : null);
            event.setMeansOfDeath(queuedEvent.meansOfDeath());
        }

        event.store();
    }
}
