package com.q3js.master.voice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.voice.dto.VoiceTokenResponse;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VoiceTokenServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final VoiceTokenService service = new VoiceTokenService(
        "https://staging.livekit.q3js.com/",
        "devkey",
        "devsecretdevsecretdevsecretdevsecret",
        Duration.ofHours(6)
    );

    @Test
    void createsMicrophoneOnlyTokenForStableServerRoom() throws Exception {
        VoiceTokenResponse first = service.create("quake.example:27961", "Ranger");
        VoiceTokenResponse second = service.create("quake.example:27961", "Ranger");
        JsonNode claims = claims(first.participantToken());
        JsonNode secondClaims = claims(second.participantToken());

        assertEquals("wss://staging.livekit.q3js.com", first.serverUrl());
        assertEquals("Ranger", claims.path("name").asText());
        assertTrue(claims.path("sub").asText().startsWith("web-"));
        assertNotEquals(claims.path("sub").asText(), secondClaims.path("sub").asText());
        assertEquals(claims.path("video").path("room").asText(), secondClaims.path("video").path("room").asText());
        assertTrue(claims.path("video").path("roomJoin").asBoolean());
        assertTrue(claims.path("video").path("canSubscribe").asBoolean());
        assertTrue(claims.path("video").path("canPublish").asBoolean());
        assertFalse(claims.path("video").path("canPublishData").asBoolean());
        assertEquals("microphone", claims.path("video").path("canPublishSources").get(0).asText());
    }

    private JsonNode claims(String token) throws Exception {
        String payload = token.split("\\.")[1];
        return objectMapper.readTree(Base64.getUrlDecoder().decode(payload));
    }
}
