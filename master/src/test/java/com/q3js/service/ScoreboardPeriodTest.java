package com.q3js.service;

import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ScoreboardPeriodTest {
    @Test
    void defaultsToAllTimeWhenMissing() {
        assertEquals(ScoreboardPeriod.ALL_TIME, ScoreboardPeriod.fromQueryParam(null));
        assertEquals(ScoreboardPeriod.ALL_TIME, ScoreboardPeriod.fromQueryParam(" "));
    }

    @Test
    void parsesSupportedAliases() {
        assertEquals(ScoreboardPeriod.DAILY, ScoreboardPeriod.fromQueryParam("daily"));
        assertEquals(ScoreboardPeriod.WEEKLY, ScoreboardPeriod.fromQueryParam("week"));
        assertEquals(ScoreboardPeriod.MONTHLY, ScoreboardPeriod.fromQueryParam("monthly"));
        assertEquals(ScoreboardPeriod.ALL_TIME, ScoreboardPeriod.fromQueryParam("all"));
    }

    @Test
    void rejectsUnknownPeriods() {
        assertThrows(BadRequestException.class, () -> ScoreboardPeriod.fromQueryParam("yearly"));
    }

    @Test
    void calculatesUtcWindowStarts() {
        OffsetDateTime now = OffsetDateTime.of(2026, 3, 11, 15, 42, 0, 0, ZoneOffset.ofHours(1));

        assertEquals(
                OffsetDateTime.of(2026, 3, 10, 14, 42, 0, 0, ZoneOffset.UTC),
                ScoreboardPeriod.DAILY.startsAt(now).orElseThrow()
        );
        assertEquals(
                OffsetDateTime.of(2026, 3, 9, 0, 0, 0, 0, ZoneOffset.UTC),
                ScoreboardPeriod.WEEKLY.startsAt(now).orElseThrow()
        );
        assertEquals(
                OffsetDateTime.of(2026, 3, 1, 0, 0, 0, 0, ZoneOffset.UTC),
                ScoreboardPeriod.MONTHLY.startsAt(now).orElseThrow()
        );
        assertFalse(ScoreboardPeriod.ALL_TIME.startsAt(now).isPresent());
    }
}
