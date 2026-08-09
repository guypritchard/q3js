package com.q3js.master.auth.controller;

import com.q3js.master.auth.dto.AdminLoginRequest;
import com.q3js.master.auth.dto.AuthTokenResponse;
import com.q3js.master.auth.service.AuthService;
import jakarta.annotation.security.PermitAll;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityScheme;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@PermitAll
@SecurityScheme(
    securitySchemeName = "jwt",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description = "Administrator JWT bearer token"
)
@Tag(name = "Authentication", description = "Administrator authentication")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @POST
    @Path("/login")
    @Operation(operationId = "loginAdmin", summary = "Authenticate the administrator")
    @APIResponse(
        responseCode = "200",
        description = "A signed admin JWT bearer token",
        content = @Content(schema = @Schema(implementation = AuthTokenResponse.class))
    )
    @APIResponse(responseCode = "400", description = "The request is invalid")
    @APIResponse(responseCode = "401", description = "The admin password is invalid")
    public AuthTokenResponse login(@Valid AdminLoginRequest request) {
        return authService.authenticate(request.password());
    }
}
