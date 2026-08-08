package com.q3js.master.voice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"serverId", "participantName"})
public record VoiceTokenRequest(
    @NotBlank
    @Size(max = 255)
    @Pattern(regexp = "^[^\\p{Cntrl}]+$")
    String serverId,

    @NotBlank
    @Size(max = 32)
    @Pattern(regexp = "^[^\\p{Cntrl}]+$")
    String participantName
) {
}
