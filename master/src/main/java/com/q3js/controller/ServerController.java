package com.q3js.controller;

import com.q3js.service.ServerService;
import com.q3js.domain.Server;
import com.q3js.service.dto.HeartbeatRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import io.vertx.core.http.HttpServerRequest;
import org.jboss.logging.Logger;

import java.util.List;

@ApplicationScoped
@Path("/api/servers")
@RequiredArgsConstructor
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServerController {
    private static final Logger LOG = Logger.getLogger(ServerController.class);

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
    public void refreshServer(HeartbeatRequest heartbeatRequest) {
        var clientIp = getClientIp();
        var server = Server.builder()
                .proxyHost(clientIp)
                .proxyPort(heartbeatRequest.getProxyPort())
                .targetHost(heartbeatRequest.getTargetHost())
                .targetPort(heartbeatRequest.getTargetPort())
                .build();
        serverService.refreshServer(server);
    }

    private String getClientIp() {
        // 1) Prefer X-Real-IP
        String xRealIp = headers.getHeaderString("X-Real-IP");
        LOG.infof("X-Real-IP: %s", xRealIp);
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        // 2) Then X-Forwarded-For (first value)
        String xForwardedFor = headers.getHeaderString("X-Forwarded-For");
        LOG.infof("X-Forwarded-For: %s", xForwardedFor);
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String first = xForwardedFor.split(",")[0].trim();
            if (!first.isEmpty()) {
                return first;
            }
        }

        // 3) Fallback to Vert.x remote address
        String host = request.remoteAddress().host();
        LOG.infof("Remote Address: %s", host);
        return host;
    }
}
