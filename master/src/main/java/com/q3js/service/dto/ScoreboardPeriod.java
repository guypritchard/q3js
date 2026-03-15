package com.q3js.service.dto;

import jakarta.ws.rs.BadRequestException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import java.util.Optional;

public enum ScoreboardPeriod {
    DAILY,
    WEEKLY,
    MONTHLY,
    ALL_TIME;

    public Optional<OffsetDateTime> startsAt(OffsetDateTime now, ZoneId zoneId) {
        LocalDate localDate = now.atZoneSameInstant(zoneId).toLocalDate();

        return switch (this) {
            case DAILY -> Optional.of(now.atZoneSameInstant(zoneId).minusHours(24).toOffsetDateTime());
            case WEEKLY -> Optional.of(
                    localDate
                            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                            .atStartOfDay(zoneId)
                            .toOffsetDateTime()
            );
            case MONTHLY -> Optional.of(
                    localDate
                            .withDayOfMonth(1)
                            .atStartOfDay(zoneId)
                            .toOffsetDateTime()
            );
            case ALL_TIME -> Optional.empty();
        };
    }

    public Optional<OffsetDateTime> startsAt(OffsetDateTime now) {
        return startsAt(now, ZoneOffset.UTC);
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
