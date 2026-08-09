package com.q3js.master.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"access_token", "token_type", "expires_in"})
public record AuthTokenResponse(
    @JsonProperty("access_token")
    @Schema(name = "access_token")
    String accessToken,

    @JsonProperty("token_type")
    @Schema(name = "token_type", examples = "Bearer")
    String tokenType,

    @JsonProperty("expires_in")
    @Schema(name = "expires_in", description = "Token lifetime in seconds", examples = "3600")
    long expiresIn
) {
}
