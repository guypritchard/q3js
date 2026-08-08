package com.q3js.master.proxy.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProxySourceVerifierTest {
    private final ProxySourceVerifier verifier = new ProxySourceVerifier();

    @Test
    void matchesRegisteredIpAddress() {
        assertTrue(verifier.matches("127.0.0.1", "127.0.0.1"));
    }

    @Test
    void matchesAddressResolvedFromRegisteredHost() {
        assertTrue(verifier.matches("localhost", "127.0.0.1"));
    }

    @Test
    void rejectsDifferentOrMissingSourceAddress() {
        assertFalse(verifier.matches("127.0.0.1", "127.0.0.2"));
        assertFalse(verifier.matches("127.0.0.1", null));
    }
}
