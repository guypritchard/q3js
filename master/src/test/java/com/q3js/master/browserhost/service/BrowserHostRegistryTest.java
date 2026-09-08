package com.q3js.master.browserhost.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.server.service.ServerStatusParser;
import io.quarkus.websockets.next.WebSocketConnection;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BrowserHostRegistryTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Clock clock = mock(Clock.class);
    private final Instant epoch = Instant.parse("2026-01-01T00:00:00Z");

    private void advance(long seconds) {
        when(clock.instant()).thenReturn(epoch.plusSeconds(seconds));
    }

    private void ready(BrowserHostRegistry registry, WebSocketConnection host) {
        registry.hostReady(host);
        registry.hostPacket(host, BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, 1,
            ("\u00ff\u00ff\u00ff\u00ffstatusResponse\n\\sv_hostname\\Hosted\\sv_maxclients\\16\n")
                .getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    void expiresHostsThatNeverBecomeReadyAndReclaimsCapacity() {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host");
        registry.registerHost(host);
        advance(30);
        registry.refreshStatuses();
        verify(host).closeAndAwait();
        registry.registerHost(connection("replacement"));
    }

    @Test
    void expiresSilentListedHostsAndDisconnectsPlayers() throws Exception {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host");
        String id = objectMapper.readTree(registry.registerHost(host)).path("serverId").asText();
        ready(registry, host);
        WebSocketConnection player = connection("player");
        registry.addPlayer(id, player);
        advance(30);
        assertTrue(registry.servers().isEmpty());
        assertThrows(IllegalStateException.class, () -> registry.addPlayer(id, connection("late")));
        registry.refreshStatuses();
        verify(host).closeAndAwait();
        verify(player).closeAndAwait();
        registry.removePlayer(player);
        registry.registerHost(connection("replacement"));
    }

    @Test
    void validStatusRefreshesKeepAnOccupiedHostAlive() throws Exception {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host");
        String id = objectMapper.readTree(registry.registerHost(host)).path("serverId").asText();
        ready(registry, host);
        registry.addPlayer(id, connection("player"));
        advance(20);
        ready(registry, host);
        advance(40);
        registry.refreshStatuses();
        assertEquals(1, registry.servers().size());
    }

    @Test
    void expiresIdleHostsDespiteStatusRepliesAndResetsIdleAfterLastPlayerLeaves() throws Exception {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host");
        String id = objectMapper.readTree(registry.registerHost(host)).path("serverId").asText();
        ready(registry, host);
        WebSocketConnection player = connection("player");
        registry.addPlayer(id, player);
        advance(20);
        ready(registry, host);
        registry.removePlayer(player);
        for (int second : new int[]{40, 60, 79}) {
            advance(second);
            ready(registry, host);
        }
        assertEquals(1, registry.servers().size());
        advance(80);
        registry.refreshStatuses();
        assertTrue(registry.servers().isEmpty());
        verify(host).closeAndAwait();
    }

    @Test
    void lifetimeCapEndsAnOccupiedResponsiveHost() throws Exception {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host");
        String id = objectMapper.readTree(registry.registerHost(host)).path("serverId").asText();
        ready(registry, host);
        WebSocketConnection player = connection("player");
        registry.addPlayer(id, player);
        for (int second : new int[]{20, 40, 60, 80, 100, 119}) {
            advance(second);
            ready(registry, host);
        }
        advance(120);
        registry.refreshStatuses();
        assertTrue(registry.servers().isEmpty());
        verify(host).closeAndAwait();
        verify(player).closeAndAwait();
    }

    @Test
    void invalidStatusCannotExtendAHostLease() {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host");
        registry.registerHost(host);
        ready(registry, host);
        advance(20);
        registry.hostPacket(host, BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, 1, new byte[]{1, 2}));
        advance(30);
        registry.refreshStatuses();
        verify(host).closeAndAwait();
    }

    @Test
    void cleanupContinuesWhenAPlayerCloseFails() throws Exception {
        BrowserHostRegistry registry = registry(1, 2);
        WebSocketConnection host = connection("host");
        String id = objectMapper.readTree(registry.registerHost(host)).path("serverId").asText();
        ready(registry, host);
        WebSocketConnection broken = connection("broken");
        WebSocketConnection other = connection("other");
        registry.addPlayer(id, broken);
        registry.addPlayer(id, other);
        doThrow(new IllegalStateException("already gone")).when(broken).closeAndAwait();
        registry.removeHost(host);
        verify(other).closeAndAwait();
        registry.registerHost(connection("replacement"));
        assertTrue(registry.servers().isEmpty());
    }

    @Test
    void listsReadyHostWithItsExactGatewayUrl() throws Exception {
        BrowserHostRegistry registry = registry(1, 2);
        WebSocketConnection host = connection("host-1");

        JsonNode registration = objectMapper.readTree(registry.registerHost(host));
        String serverId = registration.path("serverId").asText();
        String gatewayUrl = "wss://master.example/api/hosted-games/" + serverId + "/ws";
        registry.hostReady(host);
        registry.hostPacket(host, BrowserHostProtocol.frame(
            BrowserHostProtocol.DATAGRAM,
            1,
            ("\u00ff\u00ff\u00ff\u00ffstatusResponse\n"
                + "\\sv_hostname\\Browser Arena\\mapname\\q3dm17\\g_gametype\\0"
                + "\\sv_maxclients\\16\\com_gamename\\Quake3Arena\\com_protocol\\68\n"
                + "10 25 \"Ranger\"\n").getBytes(StandardCharsets.ISO_8859_1)
        ));

        assertEquals("registered", registration.path("type").asText());
        assertEquals(gatewayUrl, registration.path("gatewayUrl").asText());
        assertEquals(1, registry.servers().size());
        var listed = registry.servers().get(0);
        assertEquals("browser:" + serverId, listed.id());
        assertEquals(gatewayUrl, listed.gatewayUrl());
        assertTrue(listed.hosted());
        assertTrue(listed.secure());
        assertFalse(listed.official());
        assertEquals("Browser Arena", listed.info().sv_hostname());
        assertEquals(1, listed.info().players());
    }

    @Test
    void enforcesGameAndPlayerCapacity() throws Exception {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection host = connection("host-1");
        String serverId = objectMapper.readTree(registry.registerHost(host)).path("serverId").asText();
        assertThrows(IllegalStateException.class, () -> registry.registerHost(connection("host-2")));

        registry.hostReady(host);
        registry.hostPacket(host, BrowserHostProtocol.frame(
            BrowserHostProtocol.DATAGRAM,
            1,
            ("\u00ff\u00ff\u00ff\u00ffstatusResponse\n\\sv_hostname\\Hosted\\sv_maxclients\\16\n")
                .getBytes(StandardCharsets.ISO_8859_1)
        ));
        registry.addPlayer(serverId, connection("player-1"));

        assertThrows(IllegalStateException.class, () -> registry.addPlayer(serverId, connection("player-2")));
    }

    @Test
    void closedHostsDoNotConsumeGameCapacity() {
        BrowserHostRegistry registry = registry(1, 1);
        WebSocketConnection staleHost = connection("host-1");
        registry.registerHost(staleHost);
        when(staleHost.isOpen()).thenReturn(false);

        registry.registerHost(connection("host-2"));

        assertThrows(IllegalStateException.class, () -> registry.registerHost(connection("host-3")));
    }

    @Test
    void rejectsInvalidPublicLimits() {
        assertThrows(IllegalArgumentException.class, () -> registry(0, 1));
        assertThrows(IllegalArgumentException.class, () -> registry(1, 0));
        assertThrows(IllegalArgumentException.class, () -> new BrowserHostRegistry(
            new ServerStatusParser(), objectMapper, "https://master.example/api/hosted-games", 1, 1,
            Duration.ofSeconds(30), Duration.ofSeconds(30), Duration.ofSeconds(60), Duration.ofSeconds(120), clock
        ));
    }

    private BrowserHostRegistry registry(int maxGames, int maxPlayers) {
        advance(0);
        return new BrowserHostRegistry(
            new ServerStatusParser(), objectMapper, "wss://master.example/api/hosted-games", maxGames, maxPlayers,
            Duration.ofSeconds(30), Duration.ofSeconds(30), Duration.ofSeconds(60), Duration.ofSeconds(120), clock
        );
    }

    private static WebSocketConnection connection(String id) {
        WebSocketConnection connection = mock(WebSocketConnection.class);
        when(connection.id()).thenReturn(id);
        when(connection.isOpen()).thenReturn(true);
        return connection;
    }
}
