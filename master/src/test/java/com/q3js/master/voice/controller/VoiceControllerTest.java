package com.q3js.master.voice.controller;

import com.q3js.master.server.service.ServerService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.startsWith;
import static org.mockito.Mockito.when;

@QuarkusTest
class VoiceControllerTest {
    @InjectMock
    ServerService serverService;

    @Test
    void createsTokenForListedServer() {
        when(serverService.isListedServer("quake.example:27961")).thenReturn(true);

        given()
            .contentType("application/json")
            .body("""
                {"serverId":"quake.example:27961","participantName":"Ranger"}
                """)
            .when().post("/api/voice/token")
            .then()
            .statusCode(201)
            .body("server_url", startsWith("wss://"))
            .body("participant_token", startsWith("eyJ"));
    }

    @Test
    void rejectsUnlistedServer() {
        when(serverService.isListedServer("missing.example:27961")).thenReturn(false);

        given()
            .contentType("application/json")
            .body("""
                {"serverId":"missing.example:27961","participantName":"Ranger"}
                """)
            .when().post("/api/voice/token")
            .then()
            .statusCode(404);
    }

    @Test
    void validatesRequest() {
        given()
            .contentType("application/json")
            .body("""
                {"serverId":"","participantName":""}
                """)
            .when().post("/api/voice/token")
            .then()
            .statusCode(400);
    }
}
