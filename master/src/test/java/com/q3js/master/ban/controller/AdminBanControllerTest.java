package com.q3js.master.ban.controller;

import com.q3js.master.ban.domain.Ban;
import com.q3js.master.ban.dto.BanRequest;
import com.q3js.master.ban.service.BanService;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@QuarkusTest
class AdminBanControllerTest {
    private static final OffsetDateTime BANNED_AT = OffsetDateTime.parse("2026-08-09T20:00:00Z");

    @InjectMock
    BanService service;

    @Test
    void listsBansForAuthenticatedAdmins() {
        when(service.bans()).thenReturn(List.of(new Ban("203.0.113.7", "^1Ranger", BANNED_AT)));

        given()
            .auth().oauth2(adminToken())
            .when().get("/api/admin/bans")
            .then()
            .statusCode(200)
            .body("[0].ipAddress", equalTo("203.0.113.7"));
    }

    @Test
    void letsAuthenticatedAdminsBanAPlayerIp() {
        var request = new BanRequest("203.0.113.7", "^1Ranger");
        when(service.ban(request)).thenReturn(new Ban("203.0.113.7", "^1Ranger", BANNED_AT));

        given()
            .auth().oauth2(adminToken())
            .contentType("application/json")
            .body(request)
            .when().post("/api/admin/bans")
            .then()
            .statusCode(200)
            .body("ipAddress", equalTo("203.0.113.7"))
            .body("playerName", equalTo("^1Ranger"));

        verify(service).ban(request);
    }

    @Test
    void rejectsInvalidBanRequests() {
        given()
            .auth().oauth2(adminToken())
            .contentType("application/json")
            .body(Map.of("ipAddress", "not-an-ip", "playerName", "Ranger"))
            .when().post("/api/admin/bans")
            .then().statusCode(400);

        verifyNoInteractions(service);
    }

    @Test
    void letsAuthenticatedAdminsRemoveABan() {
        given()
            .auth().oauth2(adminToken())
            .pathParam("ipAddress", "2001:db8::7")
            .when().delete("/api/admin/bans/{ipAddress}")
            .then().statusCode(204);

        verify(service).unban("2001:db8::7");
    }

    @Test
    void allowsDeleteFromTheAdminCorsOrigin() {
        given()
            .header("Origin", "http://localhost:3000")
            .header("Access-Control-Request-Method", "DELETE")
            .when().options("/api/admin/bans/127.0.0.1")
            .then()
            .statusCode(200)
            .header("Access-Control-Allow-Origin", equalTo("http://localhost:3000"))
            .header("Access-Control-Allow-Methods", containsString("DELETE"));
    }

    @Test
    void rejectsAdminBanAccessWithoutAJwt() {
        given()
            .when().get("/api/admin/bans")
            .then().statusCode(401);

        verifyNoInteractions(service);
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
