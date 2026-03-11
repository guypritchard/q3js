package com.q3js.controller;

import com.q3js.service.EventService;
import com.q3js.service.ScoreboardPeriod;
import com.q3js.service.dto.CreateEventRequest;
import com.q3js.service.dto.KillDistributionPointResponse;
import com.q3js.service.dto.PlayerStatsResponse;
import com.q3js.service.dto.ScoreboardEntryResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;

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

    @GET
    @Path("/scoreboard")
    public List<ScoreboardEntryResponse> getGlobalScoreboard(@QueryParam("period") String period) {
        return eventService.getGlobalScoreboard(ScoreboardPeriod.fromQueryParam(period));
    }

    @GET
    @Path("/distribution")
    public List<KillDistributionPointResponse> getKillDistribution(@QueryParam("period") String period) {
        return eventService.getKillDistribution(ScoreboardPeriod.fromQueryParam(period));
    }

    @GET
    @Path("/players/{playerName}")
    public PlayerStatsResponse getPlayerStats(
            @PathParam("playerName") String playerName,
            @QueryParam("period") String period
    ) {
        return eventService.getPlayerStats(playerName, ScoreboardPeriod.fromQueryParam(period));
    }
}
