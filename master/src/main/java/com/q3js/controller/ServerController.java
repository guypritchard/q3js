package com.q3js.controller;

import com.q3js.service.ServerService;
import com.q3js.domain.Server;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import io.vertx.core.http.HttpServerRequest;

import java.util.List;

@ApplicationScoped
@Path("/api/servers")
@RequiredArgsConstructor
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServerController {

    private final ServerService serverService;
    @Context
    HttpHeaders headers;

    @Context
    HttpServerRequest request;

    @GET
    public List<Server> getAllServers() {
        return serverService.getAllServers();
    }

    @Path("/heartbeat")
    @PUT
    public void refreshServer(@QueryParam("port") int port) {
        var clientIp = getClientIp(request);
        var server = Server.builder()
                .host(clientIp)
                .port(port)
                .build();
        serverService.refreshServer(server);
    }

    private String getClientIp(HttpServerRequest request) {
        var forwarded = headers.getHeaderString("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.remoteAddress().host();
    }
}
