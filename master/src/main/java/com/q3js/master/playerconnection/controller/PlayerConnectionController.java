package com.q3js.master.playerconnection.controller;

import com.q3js.master.event.security.EventAuthenticator;
import com.q3js.master.playerconnection.dto.PlayerConnectionRequest;
import com.q3js.master.playerconnection.dto.PlayerConnectionPageResponse;
import com.q3js.master.playerconnection.mapper.PlayerConnectionMapper;
import com.q3js.master.playerconnection.service.PlayerConnectionService;

import io.vertx.core.http.HttpServerRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/player-connections")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Player connections", description = "Authenticated player connection ingestion")
public class PlayerConnectionController {
    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_PAGE_SIZE = 50;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_SEARCH_LENGTH = 128;

    private final EventAuthenticator authenticator;
    private final PlayerConnectionService service;
    private final PlayerConnectionMapper mapper;

    @Context
    HttpServerRequest request;

    public PlayerConnectionController(
        EventAuthenticator authenticator,
        PlayerConnectionService service,
        PlayerConnectionMapper mapper
    ) {
        this.authenticator = authenticator;
        this.service = service;
        this.mapper = mapper;
    }

    @POST
    @SecurityRequirement(name = "eventClientSecret")
    @Operation(operationId = "ingestPlayerConnection", summary = "Store a decoded player connection")
    @APIResponse(responseCode = "204", description = "Player connection persisted")
    @APIResponse(responseCode = "400", description = "Player connection payload is invalid")
    @APIResponse(responseCode = "401", description = "Client secret is missing or invalid")
    public Response ingest(
        @Valid @NotNull PlayerConnectionRequest connection,
        @HeaderParam(EventAuthenticator.CLIENT_SECRET_HEADER)
        @Parameter(description = "Shared game-server event secret", required = true)
        String suppliedSecret
    ) {
        if (!authenticator.isAuthorized(suppliedSecret)) {
            throw new WebApplicationException(Response.status(Response.Status.UNAUTHORIZED).build());
        }

        service.ingest(connection, sourceIp());
        return Response.noContent().build();
    }

    @GET
    @RolesAllowed("admin")
    @SecurityRequirement(name = "jwt")
    @Operation(operationId = "getPlayerConnections", summary = "List recorded player connections")
    @APIResponse(responseCode = "200", description = "Paginated player connections")
    @APIResponse(responseCode = "400", description = "Pagination or search parameters are invalid")
    @APIResponse(responseCode = "401", description = "Administrator JWT is missing or invalid")
    @APIResponse(responseCode = "403", description = "JWT does not have the admin role")
    public PlayerConnectionPageResponse connections(
        @QueryParam("page") @Parameter(description = "One-based page number") Integer page,
        @QueryParam("pageSize") @Parameter(description = "Entries per page, from 1 to 100") Integer pageSize,
        @QueryParam("search") @Parameter(description = "Player name, client IP, or server host") String search
    ) {
        return mapper.response(service.connections(
            page(page),
            pageSize(pageSize),
            search(search)
        ));
    }

    private static int page(Integer value) {
        if (value == null) return DEFAULT_PAGE;
        if (value < 1) throw new jakarta.ws.rs.BadRequestException("Page must be greater than 0.");
        return value;
    }

    private static int pageSize(Integer value) {
        if (value == null) return DEFAULT_PAGE_SIZE;
        if (value < 1 || value > MAX_PAGE_SIZE) {
            throw new jakarta.ws.rs.BadRequestException("Page size must be between 1 and 100.");
        }
        return value;
    }

    private static String search(String value) {
        if (value == null) return "";
        if (value.length() > MAX_SEARCH_LENGTH) {
            throw new jakarta.ws.rs.BadRequestException("Search must not exceed 128 characters.");
        }
        return value.trim();
    }

    private String sourceIp() {
        return request != null && request.remoteAddress() != null
            ? request.remoteAddress().host()
            : null;
    }
}
