package com.q3js.master.playerconnection.domain;

import java.time.OffsetDateTime;
import java.util.Map;

public record StoredPlayerConnection(
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
