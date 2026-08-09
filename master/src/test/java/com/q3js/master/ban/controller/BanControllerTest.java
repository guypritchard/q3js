package com.q3js.master.ban.controller;

import com.q3js.master.ban.domain.Ban;
import com.q3js.master.ban.service.BanService;
import com.q3js.master.event.security.EventAuthenticator;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@QuarkusTest
class BanControllerTest {
    private static final String DEVELOPMENT_SECRET =
        "98e9b63a7b1bcd9103cdc951cda26976d06b6076df6ab13da1f20c25c7699167";

    @InjectMock
    BanService service;

    @Test
    void returnsBansToAuthenticatedGameServers() {
        when(service.bans()).thenReturn(List.of(
            new Ban("203.0.113.7", "^1Ranger", OffsetDateTime.parse("2026-08-09T20:00:00Z"))
        ));

        given()
            .header(EventAuthenticator.CLIENT_SECRET_HEADER, DEVELOPMENT_SECRET)
            .when().get("/api/bans")
            .then()
            .statusCode(200)
            .body("[0].ipAddress", equalTo("203.0.113.7"))
            .body("[0].playerName", equalTo("^1Ranger"))
            .body("[0].bannedAt", equalTo("2026-08-09T20:00:00Z"));
    }

    @Test
    void rejectsRequestsWithoutTheGameServerSecret() {
        given()
            .when().get("/api/bans")
            .then().statusCode(401);

        verifyNoInteractions(service);
    }
}
