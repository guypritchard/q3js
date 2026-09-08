package com.q3js.master.browserhost.service;

import io.quarkus.websockets.next.HttpUpgradeCheck;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationScoped
public class BrowserHostUpgradeCheck implements HttpUpgradeCheck {
    public static final String HOST_ENDPOINT = "browser-host";
    public static final String PLAYER_ENDPOINT = "browser-player";
    private static final int MAX_TRACKED_PEERS = 4096;
    private final Set<String> allowedOrigins;
    private final int startsPerMinute;
    private final Clock clock;
    private final Map<String, ArrayDeque<Instant>> attempts = new HashMap<>();

    @Inject
    public BrowserHostUpgradeCheck(
        @ConfigProperty(name = "q3js.master.browser-host.allowed-origins") String origins,
        @ConfigProperty(name = "q3js.master.browser-host.starts-per-minute") int startsPerMinute
    ) {
        this(origins, startsPerMinute, Clock.systemUTC());
    }

    BrowserHostUpgradeCheck(String origins, int startsPerMinute, Clock clock) {
        allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim)
            .filter(origin -> !origin.isEmpty()).collect(Collectors.toUnmodifiableSet());
        if (allowedOrigins.isEmpty() || allowedOrigins.contains("*") || startsPerMinute <= 0) {
            throw new IllegalArgumentException("Browser hosting requires explicit origins and a positive start rate");
        }
        this.startsPerMinute = startsPerMinute;
        this.clock = clock;
    }

    @Override
    public boolean appliesTo(String endpointId) {
        return HOST_ENDPOINT.equals(endpointId) || PLAYER_ENDPOINT.equals(endpointId);
    }

    @Override
    public Uni<CheckResult> perform(HttpUpgradeContext context) {
        String origin = context.httpRequest().getHeader("Origin");
        if (origin == null || !allowedOrigins.contains(origin)) {
            return CheckResult.rejectUpgrade(403);
        }
        if (HOST_ENDPOINT.equals(context.endpointId())) {
            // Do not trust client-supplied forwarding headers. Reverse proxies share
            // this limit unless trusted proxy address handling is explicitly configured.
            var remote = context.httpRequest().remoteAddress();
            if (remote == null || !allowStart(remote.host())) {
                return CheckResult.rejectUpgrade(429);
            }
        }
        return CheckResult.permitUpgrade();
    }

    synchronized boolean allowStart(String peer) {
        Instant now = clock.instant();
        Instant cutoff = now.minusSeconds(60);
        attempts.values().forEach(times -> {
            while (!times.isEmpty() && !times.peekFirst().isAfter(cutoff)) times.removeFirst();
        });
        attempts.values().removeIf(ArrayDeque::isEmpty);
        if (!attempts.containsKey(peer) && attempts.size() >= MAX_TRACKED_PEERS) return false;
        ArrayDeque<Instant> times = attempts.computeIfAbsent(peer, ignored -> new ArrayDeque<>());
        if (times.size() >= startsPerMinute) return false;
        times.addLast(now);
        return true;
    }
}
