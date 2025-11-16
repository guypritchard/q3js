package com.q3js.master;

import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;


public class Q3MasterServer {

    private static final int DEFAULT_PORT = 27950;
    private static final int MAX_PACKET_SIZE = 1400;
    private static final long SERVER_TIMEOUT_MS = 3 * 60_000L;

    private final int port;
    private final DatagramSocket socket;

    private final Map<InetSocketAddress, Long> servers = new ConcurrentHashMap<>();

    public Q3MasterServer(int port) throws SocketException {
        this.port = port;
        this.socket = new DatagramSocket(this.port);
        this.socket.setSoTimeout(0);
    }

    public void start() {
        System.out.println("Q3 Master Server listening on UDP port " + port);

        try (var cleaner = Executors.newSingleThreadScheduledExecutor()) {
            cleaner.scheduleAtFixedRate(
                    this::cleanupStaleServers, 30, 30, TimeUnit.SECONDS
            );

        }

        byte[] buffer = new byte[MAX_PACKET_SIZE];
        while (!socket.isClosed()) {
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
            try {
                socket.receive(packet);
                handlePacket(packet);
            } catch (SocketException e) {
                break;
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private void handlePacket(DatagramPacket packet) {
        String message = new String(packet.getData(), packet.getOffset(), packet.getLength(),
                StandardCharsets.ISO_8859_1);

        if (message.length() >= 4 &&
                message.charAt(0) == 0xFF &&
                message.charAt(1) == 0xFF &&
                message.charAt(2) == 0xFF &&
                message.charAt(3) == 0xFF) {

            message = message.substring(4).trim();
        }

        if (message.startsWith("heartbeat")) {
            handleHeartbeat(packet, message);
        } else if (message.startsWith("getservers")) {
            handleGetServers(packet, message);
        } else {
            // Unknown packet; ignore or log if debugging.
            // System.out.println("Unknown command from " + packet.getAddress() + ":" + packet.getPort() + " -> " + message);
        }
    }

    private void handleHeartbeat(DatagramPacket packet, String message) {
        InetSocketAddress addr = new InetSocketAddress(packet.getAddress(), packet.getPort());
        long now = Instant.now().toEpochMilli();
        servers.put(addr, now);

        System.out.println("Heartbeat from " + addr + " (" + message + ")");
    }

    private void handleGetServers(DatagramPacket packet, String message) {
        // Optionally, you can inspect the requested protocol/version from `message`.
        StringBuilder sb = new StringBuilder();
        sb.append("\u00ff\u00ff\u00ff\u00ffservers\n");

        long now = Instant.now().toEpochMilli();
        servers.forEach((addr, lastSeen) -> {
            if (now - lastSeen <= SERVER_TIMEOUT_MS) {
                sb.append(addr.getAddress().getHostAddress())
                        .append(":")
                        .append(addr.getPort())
                        .append("\n");
            }
        });

        byte[] data = sb.toString().getBytes(StandardCharsets.ISO_8859_1);
        DatagramPacket reply = new DatagramPacket(
                data,
                data.length,
                packet.getAddress(),
                packet.getPort()
        );
        try {
            socket.send(reply);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void cleanupStaleServers() {
        System.out.println("Cleaning up stale servers...");
        long now = Instant.now().toEpochMilli();
        int before = servers.size();
        servers.entrySet().removeIf(e -> now - e.getValue() > SERVER_TIMEOUT_MS);
        int after = servers.size();
        if (before != after) {
            System.out.println("Cleaned stale servers: " + before + " -> " + after);
        }
    }

    public void shutdown() {
        System.out.println("Shutting down master server.");
        socket.close();
    }

    public static void main(String[] args) throws Exception {
        int port = DEFAULT_PORT;
        if (args.length >= 1) {
            port = Integer.parseInt(args[0]);
        }

        Q3MasterServer server = new Q3MasterServer(port);
        Runtime.getRuntime().addShutdownHook(new Thread(server::shutdown));
        server.start();
    }
}
