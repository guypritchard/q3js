package com.q3js.service.client;

import com.q3js.config.MasterServerConfig;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerUserResponse;
import io.quarkus.websockets.next.BasicWebSocketConnector;
import io.quarkus.websockets.next.WebSocketClientConnection;
import io.vertx.core.buffer.Buffer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import lombok.RequiredArgsConstructor;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ApplicationScoped
@RequiredArgsConstructor
public class ServerInfoClient {
    private static final byte[] STATUS_REQUEST = new byte[]{
            (byte) 0xff, (byte) 0xff, (byte) 0xff, (byte) 0xff,
            'g', 'e', 't', 's', 't', 'a', 't', 'u', 's', ' ', 'x', 'x', 'x', '\n'
    };
    private static final Pattern PLAYER_LINE_PATTERN = Pattern.compile("^\\s*(-?\\d+)\\s+(\\d+)\\s+\"(.*)\"\\s*$");
    private final MasterServerConfig masterServerConfig;
    private final Instance<BasicWebSocketConnector> connectorInstance;

    public ServerInfoResponse fetchServerInfo(String publicHost, int proxyPort, int targetPort) {
        int timeoutMs = masterServerConfig.serverInfo().timeoutMs();
        CompletableFuture<StatusQueryResult> responseFuture = new CompletableFuture<>();
        WebSocketClientConnection connection = connectorInstance.get()
                .baseUri(buildWebSocketUri(publicHost, proxyPort))
                .onBinaryMessage((ignored, message) -> responseFuture.complete(new StatusQueryResult(
                        message.toString(StandardCharsets.UTF_8),
                        0
                )))
                .onError((ignored, throwable) -> responseFuture.completeExceptionally(throwable))
                .connectAndAwait();

        long start = System.currentTimeMillis();
        try {
            connection.sendBinaryAndAwait(STATUS_REQUEST);
            StatusQueryResult rawResult = responseFuture.get(timeoutMs, TimeUnit.MILLISECONDS);
            ServerInfoResponse parsed = parseStatusResponse(rawResult.rawStatus(), new StatusParseOptions(
                    publicHost,
                    proxyPort,
                    targetPort,
                    (int) Math.max(0, System.currentTimeMillis() - start)
            ));
            if (parsed == null) {
                throw new IllegalStateException("Invalid getstatus response from " + publicHost + ":" + proxyPort);
            }
            return parsed;
        } catch (TimeoutException e) {
            throw new IllegalStateException("Timed out waiting for WebSocket status response from " + publicHost + ":" + proxyPort, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while querying server info from " + publicHost + ":" + proxyPort, e);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to query server info from " + publicHost + ":" + proxyPort, e);
        } finally {
            if (connection.isOpen()) {
                connection.closeAndAwait();
            }
        }
    }

    static ServerInfoResponse parseStatusResponse(String rawStatus, StatusParseOptions opts) {
        String[] lines = rawStatus.replace("\r", "").split("\n");
        int statusLineIndex = -1;
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].contains("statusResponse")) {
                statusLineIndex = i;
                break;
            }
        }
        if (statusLineIndex == -1 || statusLineIndex + 1 >= lines.length) {
            return null;
        }

        String rulesLine = lines[statusLineIndex + 1].trim();
        if (rulesLine.isEmpty()) {
            return null;
        }

        Map<String, String> kv = parseRules(rulesLine);
        List<ServerUserResponse> users = parseUsers(lines, statusLineIndex + 2);

        return ServerInfoResponse.builder()
                .id(opts.publicHost() + ":" + opts.targetPort())
                .sv_hostname(stripQ3Colors(firstNonBlank(kv.get("sv_hostname"), kv.get("hostname"), "Unnamed Server")))
                .mapname(firstNonBlank(kv.get("mapname"), "unknown"))
                .g_gametype(toInt(firstNonBlank(kv.get("g_gametype"), kv.get("gametype"), "0")))
                .fraglimit(toInt(kv.get("fraglimit")))
                .timelimit(toInt(kv.get("timelimit")))
                .sv_maxclients(toInt(kv.get("sv_maxclients")))
                .g_needpass(toInt(kv.get("g_needpass")))
                .capturelimit(toInt(kv.get("capturelimit")))
                .version(firstNonBlank(kv.get("version"), kv.get("com_gamename"), kv.get("gamename"), ""))
                .players(users.size())
                .ping(opts.ping())
                .port(opts.targetPort())
                .challenge(kv.getOrDefault("challenge", ""))
                .sv_maxPing(toInt(kv.get("sv_maxping")))
                .sv_minPing(toInt(kv.get("sv_minping")))
                .com_gamename(kv.getOrDefault("com_gamename", ""))
                .com_protocol(toInt(kv.get("com_protocol")))
                .dmflags(toInt(kv.get("dmflags")))
                .sv_privateClients(toInt(kv.get("sv_privateclients")))
                .sv_minRate(toInt(kv.get("sv_minrate")))
                .sv_maxRate(toInt(kv.get("sv_maxrate")))
                .sv_dlRate(toInt(kv.get("sv_dlrate")))
                .sv_floodProtect(toInt(kv.get("sv_floodprotect")))
                .sv_allowDownload(toInt(kv.get("sv_allowdownload")))
                .bot_minplayers(toInt(kv.get("bot_minplayers")))
                .gamename(kv.getOrDefault("gamename", ""))
                .g_maxGameClients(toInt(kv.get("g_maxgameclients")))
                .host(opts.publicHost())
                .proxyPort(opts.proxyPort())
                .users(users)
                .build();
    }

    URI buildWebSocketUri(String host, int port) {
        return URI.create(resolveWebSocketScheme() + "://" + host + ":" + port + "/");
    }

    private String resolveWebSocketScheme() {
        return switch (masterServerConfig.serverInfo().scheme().toLowerCase()) {
            case "ws", "wss" -> masterServerConfig.serverInfo().scheme().toLowerCase();
            case "http" -> "ws";
            case "https" -> "wss";
            default -> throw new IllegalArgumentException("Unsupported WebSocket scheme: " + masterServerConfig.serverInfo().scheme());
        };
    }

    private static Map<String, String> parseRules(String rulesLine) {
        String[] parts = rulesLine.split("\\\\");
        Map<String, String> kv = new HashMap<>();
        for (int i = 1; i + 1 < parts.length; i += 2) {
            kv.put(parts[i].toLowerCase(), parts[i + 1] == null ? "" : parts[i + 1]);
        }
        return kv;
    }

    private static List<ServerUserResponse> parseUsers(String[] lines, int startIndex) {
        List<ServerUserResponse> users = new ArrayList<>();
        for (int i = startIndex; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }
            Matcher matcher = PLAYER_LINE_PATTERN.matcher(line);
            if (!matcher.matches()) {
                continue;
            }
            users.add(ServerUserResponse.builder()
                    .score(Integer.parseInt(matcher.group(1)))
                    .ping(Integer.parseInt(matcher.group(2)))
                    .name(stripQ3Colors(matcher.group(3)))
                    .build());
        }
        return users;
    }

    private static int toInt(String value) {
        try {
            return Integer.parseInt(value == null ? "" : value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static String stripQ3Colors(String value) {
        return (value == null ? "" : value).replaceAll("\\^\\d", "");
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    record StatusQueryResult(String rawStatus, int ping) {
    }

    record StatusParseOptions(String publicHost, Integer proxyPort, int targetPort, int ping) {
    }
}
