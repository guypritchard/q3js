package com.q3js.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.domain.Server;
import com.q3js.service.dto.ServerResponse;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ServerServiceTest {
    private HttpServer httpServer;

    @AfterEach
    void tearDown() {
        if (httpServer != null) {
            httpServer.stop(0);
        }
    }

    @Test
    void getAllServersIgnoresUnreachableServers() throws Exception {
        httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        httpServer.createContext("/info", exchange -> {
            byte[] body = "{\"id\":\"reachable\",\"players\":1,\"users\":[]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(body);
            }
        });
        httpServer.start();

        ServerService serverService = new ServerService(new ObjectMapper(), 200, "http");
        List<Server> servers = servers(serverService);
        servers.clear();
        servers.add(Server.builder()
                .host("127.0.0.1")
                .proxyPort(httpServer.getAddress().getPort())
                .targetPort(27960)
                .permanent(false)
                .lastUpdated(System.currentTimeMillis())
                .build());
        servers.add(Server.builder()
                .host("127.0.0.1")
                .proxyPort(findUnusedPort())
                .targetPort(27961)
                .permanent(false)
                .lastUpdated(System.currentTimeMillis())
                .build());

        List<ServerResponse> firstResponse = serverService.getAllServers();
        List<ServerResponse> secondResponse = serverService.getAllServers();

        assertEquals(1, firstResponse.size());
        assertEquals("reachable", firstResponse.getFirst().getId());
        assertEquals(1, secondResponse.size());
        assertEquals("reachable", secondResponse.getFirst().getId());
    }

    @SuppressWarnings("unchecked")
    private static List<Server> servers(ServerService serverService) throws NoSuchFieldException, IllegalAccessException {
        Field field = ServerService.class.getDeclaredField("servers");
        field.setAccessible(true);
        return (List<Server>) field.get(serverService);
    }

    private static int findUnusedPort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
