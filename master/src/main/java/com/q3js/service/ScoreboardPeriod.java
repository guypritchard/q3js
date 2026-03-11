package com.q3js.service;

import jakarta.ws.rs.BadRequestException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import java.util.Optional;

public enum ScoreboardPeriod {
    DAILY,
    WEEKLY,
    MONTHLY,
    ALL_TIME;

    public Optional<OffsetDateTime> startsAt(OffsetDateTime now) {
        LocalDate utcDate = now.withOffsetSameInstant(ZoneOffset.UTC).toLocalDate();

        return switch (this) {
            case DAILY -> Optional.of(utcDate.atStartOfDay().atOffset(ZoneOffset.UTC));
            case WEEKLY -> Optional.of(
                    utcDate
                            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                            .atStartOfDay()
                            .atOffset(ZoneOffset.UTC)
            );
            case MONTHLY -> Optional.of(
                    utcDate
                            .withDayOfMonth(1)
                            .atStartOfDay()
                            .atOffset(ZoneOffset.UTC)
            );
            case ALL_TIME -> Optional.empty();
        };
    }

    public static ScoreboardPeriod fromQueryParam(String value) {
        if (value == null || value.isBlank()) {
            return ALL_TIME;
        }

        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "daily", "day" -> DAILY;
            case "weekly", "week" -> WEEKLY;
            case "monthly", "month" -> MONTHLY;
            case "all-time", "all_time", "alltime", "all" -> ALL_TIME;
            default -> throw new BadRequestException("Unsupported scoreboard period: " + value);
        };
    }
}
