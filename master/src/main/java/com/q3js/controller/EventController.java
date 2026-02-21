package com.q3js.controller;

import com.q3js.service.EventService;
import com.q3js.service.dto.CreateEventRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

@ApplicationScoped
@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class EventController {
    private static final Logger LOG = Logger.getLogger(EventController.class);
    private final EventService eventService;

    @POST
    public void ingestEvent(CreateEventRequest event) {
        LOG.infof("Received event: %s", event);
        eventService.ingestEvent(event);
    }
}
