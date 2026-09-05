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
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import io.quarkus.scheduler.Scheduled;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
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
    private static final Logger LOG = Logger.getLogger(BrowserHostRegistry.class);
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
    private final Duration statusTimeout;
    private final Duration idleTimeout;
    private final Duration maxLifetime;
    private final Clock clock;

    @Inject
    public BrowserHostRegistry(
        ServerStatusParser statusParser,
        ObjectMapper objectMapper,
        @ConfigProperty(name = "q3js.master.browser-host.public-url") String publicUrl,
        @ConfigProperty(name = "q3js.master.browser-host.max-games") int maxGames,
        @ConfigProperty(name = "q3js.master.browser-host.max-players") int maxPlayers,
        @ConfigProperty(name = "q3js.master.browser-host.startup-timeout") Duration startupTimeout,
        @ConfigProperty(name = "q3js.master.browser-host.status-timeout") Duration statusTimeout,
        @ConfigProperty(name = "q3js.master.browser-host.idle-timeout") Duration idleTimeout,
        @ConfigProperty(name = "q3js.master.browser-host.max-lifetime") Duration maxLifetime
    ) {
        this(statusParser, objectMapper, publicUrl, maxGames, maxPlayers, startupTimeout,
            statusTimeout, idleTimeout, maxLifetime, Clock.systemUTC());
    }

    BrowserHostRegistry(ServerStatusParser statusParser, ObjectMapper objectMapper, String publicUrl,
                        int maxGames, int maxPlayers, Duration startupTimeout, Duration statusTimeout,
                        Duration idleTimeout, Duration maxLifetime, Clock clock) {
        this.statusParser = statusParser;
        this.objectMapper = objectMapper;
        this.publicUrl = validatePublicUrl(publicUrl);
        this.maxGames = positive(maxGames, "Browser-host game capacity");
        this.maxPlayers = positive(maxPlayers, "Browser-host player capacity");
        this.startupTimeout = positive(startupTimeout, "Browser-host startup timeout");
        this.statusTimeout = positive(statusTimeout, "Browser-host status timeout");
        this.idleTimeout = positive(idleTimeout, "Browser-host idle timeout");
        this.maxLifetime = positive(maxLifetime, "Browser-host maximum lifetime");
        this.clock = clock;
    }

    public synchronized String registerHost(WebSocketConnection connection) {
        for (HostedGame game : List.copyOf(games.values())) {
            if (expired(game, clock.instant())) {
                expire(game);
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
        HostedGame game = new HostedGame(id, gatewayUrl, connection, clock.instant());
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
        for (HostedGame game : games.values()) {
            if (expired(game, clock.instant())) {
                expire(game);
            } else if (game.response != null) {
                synchronized (game) {
                    try {
                        requestStatus(game);
                    } catch (RuntimeException failure) {
                        LOG.debug("Browser host status request failed", failure);
                        expire(game);
                    }
                }
            }
        }
    }

    private boolean expired(HostedGame game, Instant now) {
        synchronized (game) {
            return !game.host.isOpen()
                || !now.isBefore(game.registeredAt.plus(maxLifetime))
                || (game.response == null
                    ? !now.isBefore(game.registeredAt.plus(startupTimeout))
                    : !now.isBefore(game.lastStatusAt.plus(statusTimeout))
                        || (game.players.isEmpty() && !now.isBefore(game.idleSince.plus(idleTimeout))));
        }
    }

    private void expire(HostedGame game) {
        // Remove discoverability and players before closing the host triggers @OnClose.
        try {
            removeHost(game.host);
        } finally {
            closeConnection(game.host);
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
                playerConnections.remove(player.id());
                closeConnection(player);
            }
            game.players.clear();
        }
    }

    private void closeConnection(WebSocketConnection connection) {
        try {
            if (connection.isOpen()) connection.closeAndAwait();
        } catch (RuntimeException failure) {
            // One broken connection must not prevent remaining slots being released.
            LOG.debug("Browser relay connection close failed", failure);
        }
    }

    public void addPlayer(String gameId, WebSocketConnection player) {
        HostedGame game = listedGame(gameId);
        synchronized (game) {
            if (games.get(gameId) != game || expired(game, clock.instant())) {
                throw new IllegalStateException("Hosted game is unavailable");
            }
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
            if (game.players.isEmpty()) game.idleSince = clock.instant();
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
            .filter(game -> !expired(game, clock.instant()))
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
                if (game.response == null) game.idleSince = clock.instant();
                game.lastStatusAt = clock.instant();
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

    private static Duration positive(Duration value, String name) {
        if (value.isZero() || value.isNegative()) throw new IllegalArgumentException(name + " must be positive");
        return value;
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
        if (expired(game, clock.instant())) {
            expire(game);
            throw new IllegalStateException("Browser host has expired");
        }
        return game;
    }

    private HostedGame listedGame(String id) {
        HostedGame game = games.get(id);
        if (game == null || game.response == null || expired(game, clock.instant())) {
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
        final Instant registeredAt;
        Instant lastStatusAt;
        Instant idleSince;
        volatile ServerResponse response;

        HostedGame(String id, String gatewayUrl, WebSocketConnection host, Instant now) {
            this.id = id;
            this.gatewayUrl = gatewayUrl;
            this.host = host;
            this.registeredAt = now;
            this.idleSince = now;
        }
    }

    private record PlayerLocation(String gameId, int endpoint) {
    }

    private record HostRegistration(String type, String serverId, String gatewayUrl) {
    }

    private record HostListed(String type, String serverId) {
    }
}
