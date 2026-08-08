package com.q3js.master.proxy.domain;

import java.time.OffsetDateTime;
import java.util.List;

public record ProxyStatus(
    String host,
    int proxyPort,
    List<ProxyPlayer> players,
    int connections,
    String sourceIp,
    OffsetDateTime receivedAt
) {
}
