package com.q3js.master.playerconnection.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(requiredProperties = {"playerName", "connectionCount", "firstSeenAt", "lastSeenAt"})
public record PlayerAddressNameResponse(
    String playerName,
    long connectionCount,
    OffsetDateTime firstSeenAt,
    OffsetDateTime lastSeenAt
) {
}
