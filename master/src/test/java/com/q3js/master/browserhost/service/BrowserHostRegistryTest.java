package com.q3js.master.browserhost.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.server.service.ServerStatusParser;
import io.quarkus.websockets.next.WebSocketConnection;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BrowserHostRegistryTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

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
            Duration.ofSeconds(30)
        ));
    }

    private BrowserHostRegistry registry(int maxGames, int maxPlayers) {
        return new BrowserHostRegistry(
            new ServerStatusParser(), objectMapper, "wss://master.example/api/hosted-games", maxGames, maxPlayers,
            Duration.ofSeconds(30)
        );
    }

    private static WebSocketConnection connection(String id) {
        WebSocketConnection connection = mock(WebSocketConnection.class);
        when(connection.id()).thenReturn(id);
        when(connection.isOpen()).thenReturn(true);
        return connection;
    }
}
