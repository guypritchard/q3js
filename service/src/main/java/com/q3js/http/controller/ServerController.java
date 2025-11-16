package com.q3js.http.controller;

import com.q3js.http.service.ServerService;
import com.q3js.http.service.dto.ServerResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

import java.util.List;

@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
@Path("/api/servers")
@ApplicationScoped
public class ServerController {
    private final ServerService serverService;

    @GET
    public List<ServerResponse> getAllServers() {
        return serverService.getAllServers();
    }
}
