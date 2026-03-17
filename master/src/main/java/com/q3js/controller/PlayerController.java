package com.q3js.controller;

import com.q3js.service.EventService;
import com.q3js.service.ServerService;
import com.q3js.service.dto.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.BadRequestException;
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
    private static final int DEFAULT_SCOREBOARD_PAGE = 1;
    private static final int DEFAULT_SCOREBOARD_PAGE_SIZE = 25;
    private static final int MAX_SCOREBOARD_PAGE_SIZE = 100;

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
    @Path("/scoreboard")
    public ScoreboardPageResponse getPlayerScoreboard(
            @QueryParam("period") String period,
            @QueryParam("timeZone") String timeZone,
            @QueryParam("page") Integer page,
            @QueryParam("pageSize") Integer pageSize
    ) {
        ZoneId requestedTimeZone = RequestedTimeZone.fromQueryParam(timeZone);
        return eventService.getPlayerScoreboard(
                ScoreboardPeriod.fromQueryParam(period),
                requestedTimeZone,
                validatePage(page),
                validatePageSize(pageSize)
        );
    }

    @GET
    @Path("/scoreboard/distribution")
    public List<KillDistributionPointResponse> getPlayerScoreboardDistribution(
            @QueryParam("period") String period,
            @QueryParam("timeZone") String timeZone
    ) {
        ZoneId requestedTimeZone = RequestedTimeZone.fromQueryParam(timeZone);
        return eventService.getPlayerScoreboardDistribution(
                ScoreboardPeriod.fromQueryParam(period),
                requestedTimeZone
        );
    }

    private int validatePage(Integer page) {
        if (page == null) {
            return DEFAULT_SCOREBOARD_PAGE;
        }

        if (page < 1) {
            throw new BadRequestException("Page must be greater than 0.");
        }

        return page;
    }

    private int validatePageSize(Integer pageSize) {
        if (pageSize == null) {
            return DEFAULT_SCOREBOARD_PAGE_SIZE;
        }

        if (pageSize < 1 || pageSize > MAX_SCOREBOARD_PAGE_SIZE) {
            throw new BadRequestException("Page size must be between 1 and 100.");
        }

        return pageSize;
    }
}
