package com.q3js.master.playerconnection.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record StoredPlayerAddress(
    String ipAddress,
    List<PlayerAddressName> names,
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
