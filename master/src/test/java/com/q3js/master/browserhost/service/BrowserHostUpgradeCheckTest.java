package com.q3js.master.browserhost.service;

import io.quarkus.websockets.next.HttpUpgradeCheck.HttpUpgradeContext;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.net.SocketAddress;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BrowserHostUpgradeCheckTest {
    @Test
    void requiresAnExplicitAllowedOriginForBothEndpoints() {
        var check = new BrowserHostUpgradeCheck("http://localhost:3000,https://q3.example", 4);
        for (String endpoint : new String[]{BrowserHostUpgradeCheck.HOST_ENDPOINT, BrowserHostUpgradeCheck.PLAYER_ENDPOINT}) {
            assertTrue(check.appliesTo(endpoint));
            for (String origin : new String[]{null, "null", "https://evil.example", "https://q3.example.evil"}) {
                var result = check.perform(context(endpoint, origin, "192.0.2.1")).await().indefinitely();
                assertFalse(result.isUpgradePermitted());
                assertEquals(403, result.getHttpResponseCode());
            }
            assertTrue(check.perform(context(endpoint, "https://q3.example", "192.0.2.1"))
                .await().indefinitely().isUpgradePermitted());
        }
        assertFalse(check.appliesTo("other-endpoint"));
    }

    @Test
    void limitsHostStartsByPeerWithoutLimitingPlayerJoinsOrTrustingForwardedHeaders() {
        Clock clock = mock(Clock.class);
        Instant start = Instant.parse("2026-01-01T00:00:00Z");
        when(clock.instant()).thenReturn(start);
        var check = new BrowserHostUpgradeCheck("https://q3.example", 1, clock);
        var first = context(BrowserHostUpgradeCheck.HOST_ENDPOINT, "https://q3.example", "192.0.2.1");
        assertTrue(check.perform(first).await().indefinitely().isUpgradePermitted());
        var spoof = context(BrowserHostUpgradeCheck.HOST_ENDPOINT, "https://q3.example", "192.0.2.1");
        when(spoof.httpRequest().getHeader("X-Forwarded-For")).thenReturn("192.0.2.2");
        assertEquals(429, check.perform(spoof).await().indefinitely().getHttpResponseCode());
        assertTrue(check.perform(context(BrowserHostUpgradeCheck.PLAYER_ENDPOINT, "https://q3.example", "192.0.2.1"))
            .await().indefinitely().isUpgradePermitted());
        assertTrue(check.perform(context(BrowserHostUpgradeCheck.HOST_ENDPOINT, "https://q3.example", "192.0.2.2"))
            .await().indefinitely().isUpgradePermitted());
        when(clock.instant()).thenReturn(start.plusSeconds(60));
        assertTrue(check.perform(first).await().indefinitely().isUpgradePermitted());
    }

    @Test
    void boundsRateLimitMemoryAndRecoversAfterExpiry() {
        Clock clock = mock(Clock.class);
        Instant start = Instant.parse("2026-01-01T00:00:00Z");
        when(clock.instant()).thenReturn(start);
        var check = new BrowserHostUpgradeCheck("https://q3.example", 1, clock);
        for (int i = 0; i < 4096; i++) assertTrue(check.allowStart("peer-" + i));
        assertFalse(check.allowStart("overflow"));
        when(clock.instant()).thenReturn(start.plusSeconds(60));
        assertTrue(check.allowStart("overflow"));
    }

    private HttpUpgradeContext context(String endpoint, String origin, String peer) {
        HttpUpgradeContext context = mock(HttpUpgradeContext.class);
        HttpServerRequest request = mock(HttpServerRequest.class);
        when(context.endpointId()).thenReturn(endpoint);
        when(context.httpRequest()).thenReturn(request);
        when(request.getHeader("Origin")).thenReturn(origin);
        when(request.remoteAddress()).thenReturn(SocketAddress.inetSocketAddress(12345, peer));
        return context;
    }
}
