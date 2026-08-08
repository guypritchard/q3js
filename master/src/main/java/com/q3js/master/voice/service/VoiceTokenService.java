package com.q3js.master.voice.service;

import com.q3js.master.voice.dto.VoiceTokenResponse;
import io.livekit.server.AccessToken;
import io.livekit.server.CanPublish;
import io.livekit.server.CanPublishData;
import io.livekit.server.CanPublishSources;
import io.livekit.server.CanSubscribe;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ServiceUnavailableException;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class VoiceTokenService {
    private final String livekitUrl;
    private final String apiKey;
    private final String apiSecret;
    private final Duration tokenTtl;

    public VoiceTokenService(
        @ConfigProperty(name = "q3js.master.voice.livekit-url") String livekitUrl,
        @ConfigProperty(name = "q3js.master.voice.api-key") String apiKey,
        @ConfigProperty(name = "q3js.master.voice.api-secret") String apiSecret,
        @ConfigProperty(name = "q3js.master.voice.token-ttl") Duration tokenTtl
    ) {
        this.livekitUrl = livekitUrl == null ? "" : livekitUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
        this.tokenTtl = tokenTtl;
    }

    public VoiceTokenResponse create(String serverId, String participantName) {
        if (livekitUrl.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new ServiceUnavailableException("Voice chat is not configured.");
        }

        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setIdentity("web-" + UUID.randomUUID());
        token.setName(participantName.trim());
        token.setTtl(tokenTtl.toMillis());
        token.addGrants(
            new RoomJoin(true),
            new RoomName(roomName(serverId)),
            new CanSubscribe(true),
            new CanPublish(true),
            new CanPublishSources(List.of("microphone")),
            new CanPublishData(false)
        );

        return new VoiceTokenResponse(webSocketUrl(livekitUrl), token.toJwt());
    }

    static String roomName(String serverId) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(serverId.getBytes(StandardCharsets.UTF_8));
            return "q3js-server-" + HexFormat.of().formatHex(digest, 0, 16);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    static String webSocketUrl(String value) {
        String normalized = value.replaceAll("/+$", "");
        if (normalized.startsWith("https://")) {
            return "wss://" + normalized.substring("https://".length());
        }
        if (normalized.startsWith("http://")) {
            return "ws://" + normalized.substring("http://".length());
        }
        if (normalized.startsWith("wss://") || normalized.startsWith("ws://")) {
            return normalized;
        }
        throw new ServiceUnavailableException("Voice chat has an invalid LiveKit URL.");
    }
}
