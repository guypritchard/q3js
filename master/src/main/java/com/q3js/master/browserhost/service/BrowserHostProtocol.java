package com.q3js.master.browserhost.service;

import io.vertx.core.buffer.Buffer;

public final class BrowserHostProtocol {
    public static final byte OPEN = 1;
    public static final byte DATAGRAM = 2;
    public static final byte CLOSE = 3;
    public static final int HEADER_BYTES = 5;
    public static final int MAX_DATAGRAM_BYTES = 16_384;

    private BrowserHostProtocol() {
    }

    public static Buffer frame(byte opcode, int endpoint, byte[] payload) {
        if (endpoint <= 0 || endpoint > 0x00ff_ffff) {
            throw new IllegalArgumentException("Endpoint is outside the virtual network range");
        }
        if (payload.length > MAX_DATAGRAM_BYTES) {
            throw new IllegalArgumentException("Datagram exceeds the Quake message limit");
        }
        return Buffer.buffer(HEADER_BYTES + payload.length)
            .appendByte(opcode)
            .appendInt(endpoint)
            .appendBytes(payload);
    }

    public static Frame decode(Buffer buffer) {
        if (buffer.length() < HEADER_BYTES) {
            throw new IllegalArgumentException("Browser-host frame is truncated");
        }
        byte opcode = buffer.getByte(0);
        int endpoint = buffer.getInt(1);
        if (endpoint <= 0 || endpoint > 0x00ff_ffff) {
            throw new IllegalArgumentException("Endpoint is outside the virtual network range");
        }
        byte[] payload = buffer.getBytes(HEADER_BYTES, buffer.length());
        if (payload.length > MAX_DATAGRAM_BYTES) {
            throw new IllegalArgumentException("Datagram exceeds the Quake message limit");
        }
        return new Frame(opcode, endpoint, payload);
    }

    public record Frame(byte opcode, int endpoint, byte[] payload) {
    }
}
