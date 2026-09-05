package com.q3js.master.browserhost.controller;

import com.q3js.master.browserhost.service.BrowserHostRegistry;
import com.q3js.master.browserhost.service.BrowserHostUpgradeCheck;
import io.quarkus.websockets.next.OnBinaryMessage;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.PathParam;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.core.buffer.Buffer;

@WebSocket(endpointId = BrowserHostUpgradeCheck.PLAYER_ENDPOINT, path = "/api/hosted-games/{serverId}/ws")
public class BrowserPlayerEndpoint {
    private final BrowserHostRegistry registry;

    public BrowserPlayerEndpoint(BrowserHostRegistry registry) {
        this.registry = registry;
    }

    @OnOpen
    public void open(@PathParam String serverId, WebSocketConnection connection) {
        registry.addPlayer(serverId, connection);
    }

    @OnBinaryMessage
    public void binary(Buffer packet, WebSocketConnection connection) {
        registry.playerPacket(connection, packet);
    }

    @OnClose
    public void close(WebSocketConnection connection) {
        registry.removePlayer(connection);
    }
}
