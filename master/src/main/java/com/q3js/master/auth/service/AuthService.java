package com.q3js.master.auth.service;

import com.q3js.master.auth.dto.AuthTokenResponse;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotAuthorizedException;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;

@ApplicationScoped
public class AuthService {
    static final String ADMIN_ROLE = "admin";

    private final byte[] adminPassword;
    private final Duration tokenTtl;
    private final String issuer;
    private final String audience;

    public AuthService(
        @ConfigProperty(name = "q3js.master.auth.admin-password") String adminPassword,
        @ConfigProperty(name = "q3js.master.auth.token-ttl") Duration tokenTtl,
        @ConfigProperty(name = "q3js.master.auth.issuer") String issuer,
        @ConfigProperty(name = "q3js.master.auth.audience") String audience
    ) {
        validateConfiguration(adminPassword, tokenTtl, issuer, audience);
        this.adminPassword = adminPassword.getBytes(StandardCharsets.UTF_8);
        this.tokenTtl = tokenTtl;
        this.issuer = issuer;
        this.audience = audience;
    }

    public AuthTokenResponse authenticate(String suppliedPassword) {
        if (suppliedPassword == null || !MessageDigest.isEqual(
            adminPassword,
            suppliedPassword.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new NotAuthorizedException("Invalid admin credentials.", "Bearer");
        }

        Instant issuedAt = Instant.now();
        String token = Jwt.issuer(issuer)
            .subject(ADMIN_ROLE)
            .upn(ADMIN_ROLE)
            .groups(Set.of(ADMIN_ROLE))
            .audience(audience)
            .issuedAt(issuedAt)
            .expiresAt(issuedAt.plus(tokenTtl))
            .sign();

        return new AuthTokenResponse(token, "Bearer", tokenTtl.toSeconds());
    }

    private static void validateConfiguration(
        String adminPassword,
        Duration tokenTtl,
        String issuer,
        String audience
    ) {
        if (adminPassword == null || adminPassword.length() < 12 || adminPassword.length() > 512) {
            throw new IllegalStateException("The admin password must contain between 12 and 512 characters.");
        }
        if (adminPassword.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalStateException("The admin password must not contain control characters.");
        }
        if (tokenTtl == null || tokenTtl.isZero() || tokenTtl.isNegative()) {
            throw new IllegalStateException("The admin token TTL must be positive.");
        }
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
            throw new IllegalStateException("The admin token issuer and audience must be configured.");
        }
    }
}
