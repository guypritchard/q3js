package com.q3js.master.ban.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"ipAddress"})
public record BanRequest(
    @NotBlank @Size(max = 64) @Pattern(regexp = "[0-9A-Fa-f:.]+") String ipAddress
) {
}
