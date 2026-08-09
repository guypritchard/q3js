package com.q3js.master.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = "password")
public record AdminLoginRequest(
    @NotBlank
    @Size(max = 512)
    String password
) {
}
