package com.q3js.master.browserhost.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BrowserHostProtocolTest {
    @Test
    void roundTripsDatagramFrame() {
        byte[] payload = { (byte) 0xff, 0, 42 };
        var decoded = BrowserHostProtocol.decode(
            BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, 0x010203, payload)
        );

        assertEquals(BrowserHostProtocol.DATAGRAM, decoded.opcode());
        assertEquals(0x010203, decoded.endpoint());
        assertArrayEquals(payload, decoded.payload());
    }

    @Test
    void rejectsInvalidFrames() {
        assertThrows(IllegalArgumentException.class, () -> BrowserHostProtocol.decode(io.vertx.core.buffer.Buffer.buffer(4)));
        assertThrows(IllegalArgumentException.class, () ->
            BrowserHostProtocol.frame(BrowserHostProtocol.DATAGRAM, 0, new byte[0])
        );
    }
}
