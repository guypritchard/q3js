package com.q3js.master.proxy.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(requiredProperties = {"host", "proxyPort", "players", "connections"})
public record ProxyStatusRequest(
    @NotBlank @Size(max = 253) String host,
    @Min(1) @Max(65535) int proxyPort,
    @NotNull @Size(max = 1024) List<@Valid Player> players,
    @Min(0) @Max(4096) int connections
) {
    @Schema(requiredProperties = {"ip", "name"})
    public record Player(
        @NotBlank @Size(max = 45) String ip,
        @NotBlank @Size(max = 128) String name,
        @Pattern(regexp = "(?i)[a-z]{2}") String countryCode
    ) {
    }
}
