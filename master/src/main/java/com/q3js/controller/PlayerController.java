package com.q3js.controller;

import com.q3js.service.EventService;
import com.q3js.service.dto.PlayerResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

import java.util.List;

@ApplicationScoped
@Path("/api/players")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class PlayerController {
    private final EventService eventService;

    @GET
    public List<PlayerResponse> getAllPlayers() {
        return eventService.getAllPlayers();
    }
}
