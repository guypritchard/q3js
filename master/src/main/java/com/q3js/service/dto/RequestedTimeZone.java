package com.q3js.service.dto;

import jakarta.ws.rs.BadRequestException;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;

public final class RequestedTimeZone {
    public static final ZoneId DEFAULT = ZoneOffset.UTC;

    private RequestedTimeZone() {
    }

    public static ZoneId fromQueryParam(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT;
        }

        try {
            return ZoneId.of(value.trim());
        } catch (DateTimeException exception) {
            throw new BadRequestException("Unsupported time zone: " + value);
        }
    }
}
