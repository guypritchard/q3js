package com.q3js.master.browserhost.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.dto.ServerInfo;
import com.q3js.master.server.dto.ServerResponse;
import com.q3js.master.server.service.ServerStatusParser;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.core.buffer.Buffer;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import io.quarkus.scheduler.Scheduled;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@ApplicationScoped
public class BrowserHostRegistry {
    private static final int STATUS_ENDPOINT = 1;
    private static final byte[] STATUS_REQUEST = {
        (byte) 0xff, (byte) 0xff, (byte) 0xff, (byte) 0xff,
        'g', 'e', 't', 's', 't', 'a', 't', 'u', 's', ' ', 'q', '3', 'j', 's', '\n'
    };
    private static final byte[] DISCONNECT_PACKET = {
        (byte) 0xff, (byte) 0xff, (byte) 0xff, (byte) 0xff,
        'd', 'i', 's', 'c', 'o', 'n', 'n', 'e', 'c', 't', '\n'
    };

    private final SecureRandom random = new SecureRandom();
    private final Map<String, HostedGame> games = new ConcurrentHashMap<>();
    private final Map<String, String> hostConnections = new ConcurrentHashMap<>();
    private final Map<String, PlayerLocation> playerConnections = new ConcurrentHashMap<>();
    private final ServerStatusParser statusParser;
    private final ObjectMapper objectMapper;
    private final String publicUrl;
    private final int maxGames;
    private final int maxPlayers;
    private final Duration startupTimeout;

    public BrowserHostRegistry(
        ServerStatusParser statusParser,
        ObjectMapper objectMapper,
        @ConfigProperty(name = "q3js.master.browser-host.public-url") String publicUrl,
        @ConfigProperty(name = "q3js.master.browser-host.max-games") int maxGames,
        @ConfigProperty(name = "q3js.master.browser-host.max-players") int maxPlayers,
        @ConfigProperty(name = "q3js.master.browser-host.startup-timeout") Duration startupTimeout
    ) {
        this.statusParser = statusParser;
        this.objectMapper = objectMapper;
        this.publicUrl = validatePublicUrl(publicUrl);
        this.maxGames = positive(maxGames, "Browser-host game capacity");
        this.maxPlayers = positive(maxPlayers, "Browser-host player capacity");
        if (startupTimeout.isZero() || startupTimeout.isNegative()) {
            throw new IllegalArgumentException("Browser-host startup timeout must be positive");
        }
        this.startupTimeout = startupTimeout;
    }

    public synchronized String registerHost(WebSocketConnection connection) {
        for (HostedGame game : List.copyOf(games.values())) {
            if (!game.host.isOpen()) {
                removeHost(game.host);
            }
        }
        if (games.size() >= maxGames) {
            throw new IllegalStateException("Browser-host capacity is full");
        }
        byte[] idBytes = new byte[16];
        String id;
        do {
            random.nextBytes(idBytes);
            id = HexFormat.of().formatHex(idBytes);
        } while (games.containsKey(id));

        String gatewayUrl = publicUrl + "/" + id + "/ws";
        HostedGame game = new HostedGame(id, gatewayUrl, connection);
        games.put(id, game);
        hostConnections.put(connection.id(), id);
        return json(new HostRegistration("registered", id, gatewayUrl));
    }

    public void hostReady(WebSocketConnection connection) {
        HostedGame game = hostGame(connection);
        synchronized (game) {
            game.host.sendBinaryAndAwait(BrowserHostProtocol.frame(BrowserHostProtocol.OPEN, STATUS_ENDPOINT, new byte[0]));
            requestStatus(game);
        }
    }

    @Scheduled(every = "${q3js.master.refresh-every}")
    void refreshStatuses() {
        Instant expiry = Instant.now().minus(startupTimeout);
        for (HostedGame game : games.values()) {
            if (!game.host.isOpen()) {
                removeHost(game.host);
            } else if (game.response == null) {
                if (game.registeredAt.isBefore(expiry)) {
                    game.host.closeAndAwait();
                    removeHost(game.host);
                }
            } else {
                synchronized (game) {
                    requestStatus(game);
                }
            }
        }
    }

    public void hostPacket(WebSocketConnection connection, Buffer message) {
        HostedGame game = hostGame(connection);
        BrowserHostProtocol.Frame frame = BrowserHostProtocol.decode(message);
        if (frame.opcode() != BrowserHostProtocol.DATAGRAM) {
            throw new IllegalArgumentException("Host may only send datagram frames");
        }
        synchronized (game) {
            if (frame.endpoint() == STATUS_ENDPOINT) {
                updateStatus(game, frame.payload());
                return;
            }
            WebSocketConnection player = game.players.get(frame.endpoint());
            if (player != null && player.isOpen()) {
                player.sendBinaryAndAwait(Buffer.buffer(frame.payload()));
            }
        }
    }

    public void removeHost(WebSocketConnection connection) {
        String id = hostConnections.remove(connection.id());
        if (id == null) {
            return;
        }
        HostedGame game = games.remove(id);
        if (game == null) {
            return;
        }
        synchronized (game) {
            for (WebSocketConnection player : game.players.values()) {
                if (player.isOpen()) {
                    player.closeAndAwait();
                }
                playerConnections.remove(player.id());
            }
            game.players.clear();
        }
    }

    public void addPlayer(String gameId, WebSocketConnection player) {
        HostedGame game = listedGame(gameId);
        synchronized (game) {
            if (game.players.size() >= maxPlayers) {
                throw new IllegalStateException("Hosted game is full");
            }
            int endpoint = game.nextEndpoint.getAndIncrement();
            if (endpoint > 0x00ff_ffff) {
                throw new IllegalStateException("Hosted game exhausted virtual endpoints");
            }
            game.players.put(endpoint, player);
            playerConnections.put(player.id(), new PlayerLocation(game.id, endpoint));
            game.host.sendBinaryAndAwait(BrowserHostProtocol.frame(BrowserHostProtocol.OPEN, endpoint, new byte[0]));
        }
    }

    public void playerPacket(WebSocketConnection player, Buffer packet) {
        if (packet.length() <= 0 || packet.length() > BrowserHostProtocol.MAX_DATAGRAM_BYTES) {
            throw new IllegalArgumentException("Player datagram exceeds the Quake message limit");
        }
        PlayerLocation location = playerLocation(player);
        HostedGame game = listedGame(location.gameId());
        synchronized (game) {
            game.host.sendBinaryAndAwait(
                BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, location.endpoint(), packet.getBytes())
            );
        }
    }

    public void removePlayer(WebSocketConnection player) {
        PlayerLocation location = playerConnections.remove(player.id());
        if (location == null) {
            return;
        }
        HostedGame game = games.get(location.gameId());
        if (game == null) {
            return;
        }
        synchronized (game) {
            game.players.remove(location.endpoint());
            if (game.host.isOpen()) {
                game.host.sendBinaryAndAwait(
                    BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, location.endpoint(), DISCONNECT_PACKET)
                );
                game.host.sendBinaryAndAwait(
                    BrowserHostProtocol.frame(BrowserHostProtocol.CLOSE, location.endpoint(), new byte[0])
                );
            }
        }
    }

    public List<ServerResponse> servers() {
        return games.values().stream()
            .map(game -> game.response)
            .filter(java.util.Objects::nonNull)
            .toList();
    }

    private void updateStatus(HostedGame game, byte[] payload) {
        RegisteredServer virtualServer = new RegisteredServer(
            "browser", 443, 27960, game.gatewayUrl.startsWith("wss:"), false, OffsetDateTime.now()
        );
        statusParser.parse(new String(payload, StandardCharsets.ISO_8859_1), virtualServer, 0)
            .ifPresent(info -> {
                game.response = response(game, info);
                game.host.sendTextAndAwait(json(new HostListed("listed", game.id)));
            });
    }

    private void requestStatus(HostedGame game) {
        game.host.sendBinaryAndAwait(
            BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, STATUS_ENDPOINT, STATUS_REQUEST)
        );
    }

    private static String validatePublicUrl(String value) {
        URI uri = URI.create(value.trim().replaceAll("/+$", ""));
        if (!("ws".equals(uri.getScheme()) || "wss".equals(uri.getScheme()))
            || uri.getHost() == null || uri.getUserInfo() != null
            || uri.getQuery() != null || uri.getFragment() != null) {
            throw new IllegalArgumentException("Browser-host public URL must be an absolute ws or wss URL without credentials, query, or fragment");
        }
        return uri.toString();
    }

    private static int positive(int value, String name) {
        if (value <= 0) {
            throw new IllegalArgumentException(name + " must be positive");
        }
        return value;
    }

    private static ServerResponse response(HostedGame game, ServerInfo info) {
        return new ServerResponse(
            "browser:" + game.id,
            game.gatewayUrl,
            true,
            "browser",
            443,
            27960,
            game.gatewayUrl.startsWith("wss:"),
            false,
            info
        );
    }

    private HostedGame hostGame(WebSocketConnection connection) {
        String id = hostConnections.get(connection.id());
        HostedGame game = id == null ? null : games.get(id);
        if (game == null) {
            throw new IllegalStateException("Browser host is not registered");
        }
        return game;
    }

    private HostedGame listedGame(String id) {
        HostedGame game = games.get(id);
        if (game == null || game.response == null || !game.host.isOpen()) {
            throw new IllegalStateException("Hosted game is unavailable");
        }
        return game;
    }

    private PlayerLocation playerLocation(WebSocketConnection player) {
        PlayerLocation location = playerConnections.get(player.id());
        if (location == null) {
            throw new IllegalStateException("Player is not attached to a hosted game");
        }
        return location;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to encode browser-host message", exception);
        }
    }

    private static final class HostedGame {
        final String id;
        final String gatewayUrl;
        final WebSocketConnection host;
        final AtomicInteger nextEndpoint = new AtomicInteger(2);
        final Map<Integer, WebSocketConnection> players = new ConcurrentHashMap<>();
        final Instant registeredAt = Instant.now();
        volatile ServerResponse response;

        HostedGame(String id, String gatewayUrl, WebSocketConnection host) {
            this.id = id;
            this.gatewayUrl = gatewayUrl;
            this.host = host;
        }
    }

    private record PlayerLocation(String gameId, int endpoint) {
    }

    private record HostRegistration(String type, String serverId, String gatewayUrl) {
    }

    private record HostListed(String type, String serverId) {
    }
}
