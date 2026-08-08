package com.q3js.master.voice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"server_url", "participant_token"})
public record VoiceTokenResponse(
    @JsonProperty("server_url")
    @Schema(name = "server_url")
    String serverUrl,

    @JsonProperty("participant_token")
    @Schema(name = "participant_token")
    String participantToken
) {
}
