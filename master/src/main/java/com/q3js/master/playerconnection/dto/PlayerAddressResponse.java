package com.q3js.master.playerconnection.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Schema(requiredProperties = {
    "ipAddress", "names", "userinfo", "connectionCount"
})
public record PlayerAddressResponse(
    String ipAddress,
    List<PlayerAddressNameResponse> names,
    String sourceIp,
    Map<String, String> userinfo,
    String serverHost,
    Integer serverPort,
    long connectionCount,
    OffsetDateTime firstSeenAt,
    OffsetDateTime lastSeenAt,
    OffsetDateTime bannedAt
) {
}
