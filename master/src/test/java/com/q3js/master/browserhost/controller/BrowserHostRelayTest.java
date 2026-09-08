package com.q3js.master.browserhost.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.browserhost.service.BrowserHostProtocol;
import com.q3js.master.browserhost.service.BrowserHostRegistry;
import com.q3js.master.server.repository.ServerRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import io.vertx.core.buffer.Buffer;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.net.http.WebSocketHandshakeException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CompletionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@QuarkusTest
class BrowserHostRelayTest {
    @TestHTTPResource URI baseUri;
    @Inject ObjectMapper mapper;
    @Inject BrowserHostRegistry registry;
    @InjectMock ServerRepository repository;
    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void relaysRealWebSocketsAndCleansUpBothSides() throws Exception {
        when(repository.findAll()).thenReturn(List.of());
        Peer host = connect("/api/hosted-games/host");
        Peer player = null;
        Peer replacement = null;
        try {
            var registration = mapper.readTree(host.text());
            String id = registration.path("serverId").asText();
            assertEquals("registered", registration.path("type").asText());
            assertTrue(registration.path("gatewayUrl").asText().endsWith("/" + id + "/ws"));
            assertTrue(registry.servers().isEmpty());
            host.socket.sendText("{\"type\":\"ready\"}", true).join();
            var statusOpen = BrowserHostProtocol.decode(host.binary());
            assertEquals(BrowserHostProtocol.OPEN, statusOpen.opcode());
            assertEquals(1, statusOpen.endpoint());
            var statusRequest = BrowserHostProtocol.decode(host.binary());
            assertEquals(BrowserHostProtocol.DATAGRAM, statusRequest.opcode());
            assertEquals(1, statusRequest.endpoint());
            assertTrue(new String(statusRequest.payload(), StandardCharsets.ISO_8859_1).contains("getstatus"));
            byte[] status = ("\u00ff\u00ff\u00ff\u00ffstatusResponse\n"
                + "\\sv_hostname\\Relay Test\\mapname\\q3dm17\\sv_maxclients\\16\n")
                .getBytes(StandardCharsets.ISO_8859_1);
            host.send(BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, 1, status));
            assertEquals("listed", mapper.readTree(host.text()).path("type").asText());
            var listing = mapper.readTree(given().get("/api/servers").then().statusCode(200).extract().asString());
            assertEquals("browser:" + id, listing.get(0).path("id").asText());

            player = connect("/api/hosted-games/" + id + "/ws");
            var open = BrowserHostProtocol.decode(host.binary());
            assertEquals(BrowserHostProtocol.OPEN, open.opcode());
            assertNotEquals(1, open.endpoint());
            byte[] request = {0, 1, (byte) 255, 42};
            player.send(Buffer.buffer(request));
            var forwarded = BrowserHostProtocol.decode(host.binary());
            assertEquals(BrowserHostProtocol.DATAGRAM, forwarded.opcode());
            assertEquals(open.endpoint(), forwarded.endpoint());
            assertArrayEquals(request, forwarded.payload());
            byte[] reply = {99, 0, (byte) 128};
            host.send(BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, open.endpoint(), reply));
            assertArrayEquals(reply, player.binary().getBytes());

            player.socket.sendClose(WebSocket.NORMAL_CLOSURE, "leaving").join();
            var disconnect = BrowserHostProtocol.decode(host.binary());
            assertEquals(open.endpoint(), disconnect.endpoint());
            assertEquals(BrowserHostProtocol.DATAGRAM, disconnect.opcode());
            assertTrue(new String(disconnect.payload(), StandardCharsets.ISO_8859_1).contains("disconnect"));
            var close = BrowserHostProtocol.decode(host.binary());
            assertEquals(BrowserHostProtocol.CLOSE, close.opcode());
            assertEquals(open.endpoint(), close.endpoint());

            replacement = connect("/api/hosted-games/" + id + "/ws");
            assertEquals(BrowserHostProtocol.OPEN, BrowserHostProtocol.decode(host.binary()).opcode());
            host.socket.sendClose(WebSocket.NORMAL_CLOSURE, "ending game").join();
            replacement.closed.get(5, TimeUnit.SECONDS);
            assertTrue(registry.servers().isEmpty());
        } finally {
            host.socket.abort();
            if (player != null) player.socket.abort();
            if (replacement != null) replacement.socket.abort();
        }
    }

    @Test
    void refusesAnUnapprovedBrowserOriginBeforeUpgrade() {
        var failure = assertThrows(CompletionException.class, () -> client.newWebSocketBuilder()
            .header("Origin", "https://unapproved.example")
            .buildAsync(uri("/api/hosted-games/host"), new Peer()).join());
        var handshake = assertInstanceOf(WebSocketHandshakeException.class, failure.getCause());
        assertEquals(403, handshake.getResponse().statusCode());
    }

    private URI uri(String path) {
        return URI.create(baseUri.toString().replaceFirst("^http", "ws")).resolve(path);
    }

    private Peer connect(String path) throws Exception {
        Peer peer = new Peer();
        peer.socket = client.newWebSocketBuilder().header("Origin", "http://localhost:3000")
            .buildAsync(uri(path), peer).get(5, TimeUnit.SECONDS);
        return peer;
    }

    private static class Peer implements WebSocket.Listener {
        WebSocket socket;
        final BlockingQueue<String> texts = new LinkedBlockingQueue<>();
        final BlockingQueue<Buffer> binaries = new LinkedBlockingQueue<>();
        final CompletableFuture<Void> closed = new CompletableFuture<>();
        final StringBuilder textParts = new StringBuilder();
        final ByteArrayOutputStream binaryParts = new ByteArrayOutputStream();

        @Override public void onOpen(WebSocket socket) { socket.request(1); }

        @Override public CompletionStage<?> onText(WebSocket socket, CharSequence data, boolean last) {
            textParts.append(data);
            if (last) { texts.add(textParts.toString()); textParts.setLength(0); }
            socket.request(1);
            return null;
        }

        @Override public CompletionStage<?> onBinary(WebSocket socket, ByteBuffer data, boolean last) {
            byte[] bytes = new byte[data.remaining()];
            data.get(bytes);
            binaryParts.writeBytes(bytes);
            if (last) { binaries.add(Buffer.buffer(binaryParts.toByteArray())); binaryParts.reset(); }
            socket.request(1);
            return null;
        }

        @Override public CompletionStage<?> onClose(WebSocket socket, int status, String reason) {
            closed.complete(null);
            return null;
        }

        @Override public void onError(WebSocket socket, Throwable error) { closed.completeExceptionally(error); }
        void send(Buffer data) { socket.sendBinary(ByteBuffer.wrap(data.getBytes()), true).join(); }
        String text() throws Exception { var value = texts.poll(5, TimeUnit.SECONDS); assertNotNull(value, "Expected relay text"); return value; }
        Buffer binary() throws Exception { var value = binaries.poll(5, TimeUnit.SECONDS); assertNotNull(value, "Expected relay packet"); return value; }
    }
}
