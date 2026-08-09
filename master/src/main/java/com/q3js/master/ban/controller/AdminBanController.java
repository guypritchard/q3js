package com.q3js.master.ban.controller;

import com.q3js.master.ban.dto.BanRequest;
import com.q3js.master.ban.dto.BanResponse;
import com.q3js.master.ban.service.BanService;

import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/admin/bans")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
@SecurityRequirement(name = "jwt")
@Tag(name = "Admin bans", description = "Administrator IP-ban management")
public class AdminBanController {
    private final BanService service;

    public AdminBanController(BanService service) {
        this.service = service;
    }

    @GET
    @Operation(operationId = "getAdminBans", summary = "List bans for the admin console")
    @APIResponse(responseCode = "200", description = "Current ban list")
    @APIResponse(responseCode = "401", description = "Administrator JWT is missing or invalid")
    @APIResponse(responseCode = "403", description = "JWT does not have the admin role")
    public List<BanResponse> bans() {
        return service.bans().stream().map(AdminBanController::response).toList();
    }

    @POST
    @Operation(operationId = "banPlayer", summary = "Ban a player IP address")
    @APIResponse(responseCode = "200", description = "IP address is banned")
    @APIResponse(responseCode = "400", description = "Ban request is invalid")
    @APIResponse(responseCode = "401", description = "Administrator JWT is missing or invalid")
    @APIResponse(responseCode = "403", description = "JWT does not have the admin role")
    public BanResponse ban(@Valid @NotNull BanRequest request) {
        return response(service.ban(request));
    }

    @DELETE
    @Path("/{ipAddress}")
    @Operation(operationId = "unbanPlayer", summary = "Remove an IP ban")
    @APIResponse(responseCode = "204", description = "IP address is not banned")
    @APIResponse(responseCode = "400", description = "IP address is invalid")
    @APIResponse(responseCode = "401", description = "Administrator JWT is missing or invalid")
    @APIResponse(responseCode = "403", description = "JWT does not have the admin role")
    public Response unban(
        @PathParam("ipAddress")
        @NotBlank @Size(max = 64) @Pattern(regexp = "[0-9A-Fa-f:.]+")
        String ipAddress
    ) {
        service.unban(ipAddress);
        return Response.noContent().build();
    }

    private static BanResponse response(com.q3js.master.ban.domain.Ban ban) {
        return new BanResponse(ban.ipAddress(), ban.playerName(), ban.bannedAt());
    }
}
