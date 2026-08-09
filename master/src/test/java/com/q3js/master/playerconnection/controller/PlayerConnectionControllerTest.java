package com.q3js.master.playerconnection.controller;

import com.q3js.master.event.security.EventAuthenticator;
import com.q3js.master.playerconnection.domain.PlayerConnectionPage;
import com.q3js.master.playerconnection.domain.StoredPlayerConnection;
import com.q3js.master.playerconnection.dto.PlayerConnectionRequest;
import com.q3js.master.playerconnection.service.PlayerConnectionService;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;
import java.time.OffsetDateTime;

import static io.restassured.RestAssured.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class PlayerConnectionControllerTest {
    private static final String DEVELOPMENT_SECRET =
        "98e9b63a7b1bcd9103cdc951cda26976d06b6076df6ab13da1f20c25c7699167";

    @InjectMock
    PlayerConnectionService service;

    @Test
    void listsConnectionsForAuthenticatedAdmins() {
        var receivedAt = OffsetDateTime.parse("2026-08-09T20:00:00Z");
        when(service.connections(1, 50, "Ranger")).thenReturn(new PlayerConnectionPage(
            1,
            50,
            1,
            1,
            false,
            false,
            List.of(new StoredPlayerConnection(
                7,
                "10.0.0.1",
                "203.0.113.7",
                "^1Ranger",
                Map.of("name", "^1Ranger", "rate", "25000"),
                "game.example.com",
                27961,
                receivedAt
            ))
        ));

        given()
            .auth().oauth2(adminToken())
            .queryParam("search", "Ranger")
            .when().get("/api/player-connections")
            .then()
            .statusCode(200)
            .body("totalEntries", equalTo(1))
            .body("entries[0].clientIp", equalTo("203.0.113.7"))
            .body("entries[0].userinfo.rate", equalTo("25000"));

        verify(service).connections(1, 50, "Ranger");
    }

    @Test
    void rejectsConnectionListingWithoutAdminJwt() {
        given()
            .when().get("/api/player-connections")
            .then().statusCode(401);

        verifyNoInteractions(service);
    }

    @Test
    void acceptsAuthenticatedPlayerConnections() {
        given()
            .contentType("application/json")
            .header(EventAuthenticator.CLIENT_SECRET_HEADER, DEVELOPMENT_SECRET)
            .body(validConnection())
            .when().post("/api/player-connections")
            .then().statusCode(204);

        verify(service).ingest(any(PlayerConnectionRequest.class), anyString());
    }

    @Test
    void rejectsMissingClientSecret() {
        given()
            .contentType("application/json")
            .body(validConnection())
            .when().post("/api/player-connections")
            .then().statusCode(401);

        verifyNoInteractions(service);
    }

    @Test
    void rejectsInvalidClientIp() {
        given()
            .contentType("application/json")
            .header(EventAuthenticator.CLIENT_SECRET_HEADER, DEVELOPMENT_SECRET)
            .body(Map.of(
                "clientIp", "not-an-ip",
                "playerName", "Ranger",
                "userinfo", Map.of("name", "Ranger"),
                "serverHost", "game.example.com",
                "serverPort", 27961
            ))
            .when().post("/api/player-connections")
            .then().statusCode(400);

        verifyNoInteractions(service);
    }

    private Map<String, Object> validConnection() {
        return Map.of(
            "clientIp", "203.0.113.7",
            "playerName", "^1Ranger",
            "userinfo", Map.of("name", "^1Ranger", "rate", "25000"),
            "serverHost", "game.example.com",
            "serverPort", 27961
        );
    }

    private String adminToken() {
        return given()
            .contentType("application/json")
            .body(Map.of("password", "test-admin-password"))
            .when().post("/api/auth/login")
            .then().statusCode(200)
            .extract().path("access_token");
    }
}
