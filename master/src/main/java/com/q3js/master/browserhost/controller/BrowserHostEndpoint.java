package com.q3js.master.browserhost.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.browserhost.service.BrowserHostRegistry;
import io.quarkus.websockets.next.OnBinaryMessage;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.core.buffer.Buffer;

@WebSocket(path = "/api/hosted-games/host")
public class BrowserHostEndpoint {
    private final BrowserHostRegistry registry;
    private final ObjectMapper objectMapper;

    public BrowserHostEndpoint(BrowserHostRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @OnOpen
    public String open(WebSocketConnection connection) {
        return registry.registerHost(connection);
    }

    @OnTextMessage
    public void text(String message, WebSocketConnection connection) throws Exception {
        JsonNode control = objectMapper.readTree(message);
        if (!"ready".equals(control.path("type").asText())) {
            throw new IllegalArgumentException("Unsupported browser-host control message");
        }
        registry.hostReady(connection);
    }

    @OnBinaryMessage
    public void binary(Buffer message, WebSocketConnection connection) {
        registry.hostPacket(connection, message);
    }

    @OnClose
    public void close(WebSocketConnection connection) {
        registry.removeHost(connection);
    }
}
