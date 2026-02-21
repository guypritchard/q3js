package com.q3js.controller;

import com.fasterxml.jackson.databind.JsonNode;
import io.vertx.core.http.HttpServerRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

@ApplicationScoped
@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EventController {
    private static final Logger LOG = Logger.getLogger(EventController.class);

    @Context
    HttpHeaders headers;

    @Context
    HttpServerRequest request;

    @POST
    public void ingestEvent(JsonNode event) {
        LOG.infof("Received event from %s: %s", getClientIp(), event);
    }

    private String getClientIp() {
        var xRealIp = headers.getHeaderString("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        var xForwardedFor = headers.getHeaderString("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String first = xForwardedFor.split(",")[0].trim();
            if (!first.isEmpty()) {
                return first;
            }
        }

        return request.remoteAddress().host();
    }
}
