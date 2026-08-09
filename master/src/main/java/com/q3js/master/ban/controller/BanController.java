package com.q3js.master.ban.controller;

import com.q3js.master.ban.dto.BanResponse;
import com.q3js.master.ban.service.BanService;
import com.q3js.master.event.security.EventAuthenticator;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/bans")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Bans", description = "Authenticated game-server ban synchronization")
@SecurityRequirement(name = "eventClientSecret")
public class BanController {
    private final EventAuthenticator authenticator;
    private final BanService service;

    public BanController(EventAuthenticator authenticator, BanService service) {
        this.authenticator = authenticator;
        this.service = service;
    }

    @GET
    @Operation(operationId = "getBans", summary = "List banned player IP addresses")
    @APIResponse(responseCode = "200", description = "Current ban list")
    @APIResponse(responseCode = "401", description = "Client secret is missing or invalid")
    public List<BanResponse> bans(
        @HeaderParam(EventAuthenticator.CLIENT_SECRET_HEADER)
        @Parameter(description = "Shared game-server event secret", required = true)
        String suppliedSecret
    ) {
        if (!authenticator.isAuthorized(suppliedSecret)) {
            throw new WebApplicationException(Response.status(Response.Status.UNAUTHORIZED).build());
        }

        return service.bans().stream()
            .map(ban -> new BanResponse(ban.ipAddress(), ban.playerName(), ban.bannedAt()))
            .toList();
    }
}
