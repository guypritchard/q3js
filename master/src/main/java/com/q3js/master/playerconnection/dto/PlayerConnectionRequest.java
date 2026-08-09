package com.q3js.master.playerconnection.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record PlayerConnectionRequest(
    @NotBlank @Size(max = 64) @Pattern(regexp = "[0-9A-Fa-f:.]+") String clientIp,
    @NotBlank @Size(max = 128) String playerName,
    @NotEmpty @Size(max = 128)
    Map<@NotBlank @Size(max = 64) String, @NotNull @Size(max = 1024) String> userinfo,
    @NotBlank @Size(max = 255) String serverHost,
    @NotNull @Min(1) @Max(65535) Integer serverPort
) {
}
