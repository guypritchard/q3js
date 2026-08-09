package com.q3js.master.ban.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(requiredProperties = {"ipAddress", "bannedAt"})
public record BanResponse(
    String ipAddress,
    OffsetDateTime bannedAt
) {
}
