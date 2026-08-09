package com.q3js.master.auth.service;

import jakarta.ws.rs.NotAuthorizedException;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthServiceTest {
    private static final String PASSWORD = "strong-admin-password";

    @Test
    void rejectsUnsafeConfiguration() {
        assertThrows(IllegalStateException.class, () -> service("short", Duration.ofHours(1)));
        assertThrows(IllegalStateException.class, () -> service(PASSWORD + "\n", Duration.ofHours(1)));
        assertThrows(IllegalStateException.class, () -> service(PASSWORD, Duration.ZERO));
    }

    @Test
    void rejectsIncorrectCredentialsBeforeSigning() {
        assertThrows(NotAuthorizedException.class, () ->
            service(PASSWORD, Duration.ofHours(1)).authenticate("incorrect-password")
        );
    }

    private static AuthService service(String password, Duration ttl) {
        return new AuthService(password, ttl, "q3js-master", "q3js-admin");
    }
}
