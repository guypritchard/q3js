package com.q3js.master.auth.controller;

import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class AuthControllerTest {
    @Inject
    JWTParser jwtParser;

    @Test
    void authenticatesAdminAndReturnsVerifiableJwt() throws ParseException {
        String token = given()
            .contentType("application/json")
            .body("""
                {"password":"test-admin-password"}
                """)
            .when().post("/api/auth/login")
            .then()
            .statusCode(200)
            .body("access_token", not(blankOrNullString()))
            .body("token_type", equalTo("Bearer"))
            .body("expires_in", greaterThan(0))
            .extract().path("access_token");

        JsonWebToken claims = jwtParser.parse(token);
        assertEquals("q3js-master", claims.getIssuer());
        assertEquals("admin", claims.getSubject());
        assertTrue(claims.getAudience().contains("q3js-admin"));
        assertTrue(claims.getGroups().contains("admin"));
    }

    @Test
    void rejectsInvalidPassword() {
        given()
            .contentType("application/json")
            .body("""
                {"password":"wrong-password"}
                """)
            .when().post("/api/auth/login")
            .then()
            .statusCode(401)
            .header("WWW-Authenticate", equalTo("Bearer"));
    }

    @Test
    void validatesRequest() {
        given()
            .contentType("application/json")
            .body("""
                {"password":""}
                """)
            .when().post("/api/auth/login")
            .then()
            .statusCode(400);
    }
}
