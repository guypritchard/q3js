package com.q3js.master.playerconnection.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;
import java.util.Map;

@Schema(requiredProperties = {
    "id", "clientIp", "playerName", "userinfo", "serverHost", "serverPort", "receivedAt"
})
public record PlayerConnectionResponse(
    long id,
    String sourceIp,
    String clientIp,
    String playerName,
    Map<String, String> userinfo,
    String serverHost,
    int serverPort,
    OffsetDateTime receivedAt
) {
}
