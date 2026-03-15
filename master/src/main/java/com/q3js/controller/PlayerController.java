package com.q3js.controller;

import com.q3js.service.EventService;
import com.q3js.service.ServerService;
import com.q3js.service.dto.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

import java.time.ZoneId;
import java.util.List;

@ApplicationScoped
@Path("/api/players")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class PlayerController {
    private final EventService eventService;
    private final ServerService serverService;

    @GET
    public List<PlayerResponse> getAllPlayers() {
        return eventService.getAllPlayers();
    }

    @GET
    @Path("/{playerName}")
    public PlayerStatsResponse getPlayerStats(
            @PathParam("playerName") String playerName,
            @QueryParam("period") String period,
            @QueryParam("timeZone") String timeZone
    ) {
        ZoneId requestedTimeZone = RequestedTimeZone.fromQueryParam(timeZone);
        return eventService.getPlayerStats(playerName, ScoreboardPeriod.fromQueryParam(period), requestedTimeZone);
    }

    @GET
    @Path("/current/count")
    public CurrentPlayerCountResponse getCurrentPlayerCount() {
        return serverService.getCurrentPlayerCount();
    }
}
