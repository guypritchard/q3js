package com.q3js.master.ban.domain;

import java.time.OffsetDateTime;

public record Ban(
    String ipAddress,
    String playerName,
    OffsetDateTime bannedAt
) {
}
