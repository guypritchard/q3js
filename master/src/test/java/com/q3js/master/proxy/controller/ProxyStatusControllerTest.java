package com.q3js.master.proxy.controller;

import com.q3js.master.proxy.dto.ProxyStatusRequest;
import com.q3js.master.proxy.service.ProxyStatusService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.ws.rs.ForbiddenException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class ProxyStatusControllerTest {
    @InjectMock
    ProxyStatusService proxyStatusService;

    @Test
    void acceptsStatusWithoutAuthentication() {
        given()
            .contentType("application/json")
            .body(validStatus())
            .when().put("/api/proxies/status")
            .then()
            .statusCode(204);

        verify(proxyStatusService).update(
            eq(new ProxyStatusRequest(
                "game.example.com",
                27961,
                List.of(new ProxyStatusRequest.Player("203.0.113.10", "Ranger", null)),
                3
            )),
            anyString()
        );
    }

    @Test
    void rejectsInvalidPlayerInformation() {
        var status = validStatus();
        status.put("players", List.of(Map.of("ip", "", "name", "Ranger")));

        given()
            .contentType("application/json")
            .body(status)
            .when().put("/api/proxies/status")
            .then()
            .statusCode(400);

        verifyNoInteractions(proxyStatusService);
    }

    @Test
    void rejectsStatusFromTheWrongSource() {
        doThrow(new ForbiddenException())
            .when(proxyStatusService).update(
                eq(new ProxyStatusRequest(
                    "game.example.com",
                    27961,
                    List.of(new ProxyStatusRequest.Player("203.0.113.10", "Ranger", null)),
                    3
                )),
                anyString()
            );

        given()
            .contentType("application/json")
            .body(validStatus())
            .when().put("/api/proxies/status")
            .then()
            .statusCode(403);
    }

    private Map<String, Object> validStatus() {
        return new java.util.HashMap<>(Map.of(
            "host", "game.example.com",
            "proxyPort", 27961,
            "players", List.of(Map.of(
                "ip", "203.0.113.10",
                "name", "Ranger"
            )),
            "connections", 3
        ));
    }
}
