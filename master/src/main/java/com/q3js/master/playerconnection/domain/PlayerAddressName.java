package com.q3js.master.playerconnection.domain;

import java.time.OffsetDateTime;

public record PlayerAddressName(
    String playerName,
    long connectionCount,
    OffsetDateTime firstSeenAt,
    OffsetDateTime lastSeenAt
) {
}
