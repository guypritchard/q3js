package com.q3js.udp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

public class UdpMasterServer {
    private static final Logger log = LoggerFactory.getLogger(UdpMasterServer.class);

    public static final int DEFAULT_PORT = 27950;
    private static final long PRUNE_INTERVAL_MS = 350_000;
    private static final int MAX_PACKET = 1400; // safe MTU for UDP

    private final int port;
    private final DatagramSocket socket;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final ExecutorService workers = Executors.newSingleThreadExecutor();
    private final AtomicBoolean running = new AtomicBoolean(false);

    private final Map<String, ServerInfo> servers = new ConcurrentHashMap<>();
    private final Set<InetSocketAddress> subscribers = ConcurrentHashMap.newKeySet();

    private static final int CHALLENGE_MIN_LENGTH = 9;
    private static final int CHALLENGE_MAX_LENGTH = 12;

    public UdpMasterServer(int port) throws Exception {
        this.port = port;
        this.socket = new DatagramSocket(new InetSocketAddress("0.0.0.0", port));
        this.socket.setReceiveBufferSize(1 << 20);
        this.socket.setSendBufferSize(1 << 20);
    }

    // ===== lifecycle =====
    public void start() {
        if (!running.compareAndSet(false, true)) return;
        log.info("master server started at {} UTC, UDP {}", Instant.now(), port);

        scheduler.scheduleAtFixedRate(this::pruneServers, PRUNE_INTERVAL_MS, PRUNE_INTERVAL_MS, TimeUnit.MILLISECONDS);

        workers.submit(() -> {
            var buf = new byte[MAX_PACKET];
            while (running.get()) {
                try {
                    var p = new DatagramPacket(buf, buf.length);
                    socket.receive(p);
                    handlePacket(Arrays.copyOfRange(p.getData(), 0, p.getLength()),
                            new InetSocketAddress(p.getAddress(), p.getPort()));
                } catch (SocketException se) {
                    if (running.get()) log.warn("socket exception: {}", se.toString());
                } catch (Exception e) {
                    log.warn("recv error: {}", e.toString());
                }
            }
        });
    }

    public void stop() {
        if (!running.compareAndSet(true, false)) return;
        scheduler.shutdownNow();
        workers.shutdownNow();
        socket.close();
    }

    // ===== protocol helpers =====
    private static byte[] formatOOBBytes(String data) {
        var out = new ByteArrayOutputStream(data.length() + 6);
        out.write(0xFF);
        out.write(0xFF);
        out.write(0xFF);
        out.write(0xFF);
        out.writeBytes(data.getBytes(StandardCharsets.ISO_8859_1));
        out.write(0x00);
        return out.toByteArray();
    }

    private static String stripOOB(byte[] pkt) {
        if (pkt.length < 5) return null;
        if ((pkt[0] & 0xFF) != 0xFF || (pkt[1] & 0xFF) != 0xFF ||
                (pkt[2] & 0xFF) != 0xFF || (pkt[3] & 0xFF) != 0xFF)
            return null;
        var end = pkt.length - 1; // drop trailing \0 if present
        if (end >= 0 && pkt[end] == 0x00) end--;
        return new String(pkt, 4, end - 3, StandardCharsets.ISO_8859_1);
    }

    private static Map<String, String> parseInfoString(String s) {
        var m = new HashMap<String, String>();
        if (s == null || s.isEmpty()) return m;
        var split = s.split("\\\\");
        for (var i = 0; i + 1 < split.length; i += 2) m.put(split[i], split[i + 1]);
        return m;
    }

    private static String buildChallenge() {
        var rnd = ThreadLocalRandom.current();
        var length = CHALLENGE_MIN_LENGTH - 1 + rnd.nextInt(CHALLENGE_MAX_LENGTH - CHALLENGE_MIN_LENGTH + 1);
        var s = new StringBuilder(length);
        while (s.length() < length) {
            var c = rnd.nextInt(33, 127);
            if (c == '\\' || c == ';' || c == '"' || c == '%' || c == '/') continue;
            s.append((char) c);
        }
        return s.toString();
    }

    private static String idOf(String ip, int port) {
        return ip + ":" + port;
    }

    // ===== networking =====
    private void send(InetSocketAddress dst, String payload) {
        var data = formatOOBBytes(payload);
        var out = new DatagramPacket(data, data.length, dst.getAddress(), dst.getPort());
        try {
            socket.send(out);
        } catch (Exception e) {
            log.warn("send error {} -> {}: {}", payload, dst, e.toString());
        }
    }

    private void sendGetInfo(InetSocketAddress serverAddr) {
        var chal = buildChallenge();
        log.info("{}:{} <--- getinfo \"{}\"", serverAddr.getAddress().getHostAddress(), serverAddr.getPort(), chal);
        send(serverAddr, "getinfo " + chal);
    }

    private String buildGetServersResponse(Collection<ServerInfo> list) {
        var msg = new StringBuilder("getserversResponse");
        for (var s : list) {
            var oct = s.addr.split("\\.");
            if (oct.length != 4) continue;
            msg.append('\\');
            for (var i = 0; i < 4; i++) {
                var v = Integer.parseInt(oct[i]) & 0xFF;
                msg.append((char) v);
            }
            var p = s.port & 0xFFFF;
            msg.append((char) ((p & 0xFF00) >> 8));
            msg.append((char) (p & 0xFF));
        }
        msg.append("\\EOT");
        return msg.toString();
    }

    private void sendServersTo(InetSocketAddress dst, Collection<ServerInfo> list) {
        var msg = buildGetServersResponse(list);
        log.info("{}:{} <--- getserversResponse {} server(s)", dst.getAddress().getHostAddress(), dst.getPort(), list.size());
        send(dst, msg);
    }

    private void notifySubscribers(Collection<ServerInfo> update) {
        var msg = buildGetServersResponse(update);
        var data = formatOOBBytes(msg);
        for (var sub : subscribers) {
            try {
                var out = new DatagramPacket(data, data.length, sub.getAddress(), sub.getPort());
                socket.send(out);
            } catch (Exception e) {
                log.warn("notify error to {}: {}", sub, e.toString());
            }
        }
    }

    // ===== state mgmt =====
    private void updateServer(String ip, int port, Map<String, String> info) {
        var id = idOf(ip, port);
        var s = servers.computeIfAbsent(id, k -> new ServerInfo(ip, port));
        s.lastUpdate = System.currentTimeMillis();
        if (info != null) s.info.putAll(info);
        notifySubscribers(Collections.singletonList(s));
    }

    private void removeServer(String id) {
        var s = servers.remove(id);
        if (s != null) {
            log.info("{}:{} timed out, {} server(s) left", s.addr, s.port, servers.size());
        }
    }

    private void pruneServers() {
        var now = System.currentTimeMillis();
        for (var e : servers.entrySet()) {
            if (now - e.getValue().lastUpdate > PRUNE_INTERVAL_MS) removeServer(e.getKey());
        }
    }

    // ===== dispatcher =====
    private void handlePacket(byte[] pkt, InetSocketAddress from) {
        var ip = from.getAddress().getHostAddress();
        var port = from.getPort();

        var msg = stripOOB(pkt);
        if (msg == null) return;

        if (msg.startsWith("heartbeat")) {
            log.info("{}:{} ---> heartbeat", ip, port);
            // source port is the game server port; query info
            sendGetInfo(from);
            return;
        }

        if (msg.startsWith("getservers ")) {
            log.info("{}:{} ---> getservers", ip, port);
            sendServersTo(from, servers.values());
            // optionally treat as a subscriber that wants deltas
            subscribers.add(from);
            return;
        }

        if (msg.startsWith("subscribe")) { // nonstandard, kept for convenience
            log.info("{}:{} ---> subscribe", ip, port);
            subscribers.add(from);
            sendServersTo(from, servers.values());
            return;
        }

        if (msg.startsWith("infoResponse\n")) {
            var payload = msg.substring("infoResponse\n".length());
            var info = parseInfoString(payload);
            log.info("{}:{} ---> infoResponse keys={}", ip, port, info.keySet());
            updateServer(ip, port, info);
            return;
        }

        if (msg.startsWith("statusResponse\n")) {
            return;
        }

        log.warn("{}:{} ---> unexpected: {}", ip, port, summarize(msg));
    }

    private static String summarize(String s) {
        return s.length() > 80 ? s.substring(0, 80) + "…" : s;
    }

    // ===== data =====
    private static final class ServerInfo {
        final String addr;
        final int port;
        volatile long lastUpdate;
        final Map<String, String> info = new ConcurrentHashMap<>();

        ServerInfo(String addr, int port) {
            this.addr = addr;
            this.port = port;
            this.lastUpdate = System.currentTimeMillis();
        }
    }

    // ===== config =====
    public record Config(int port) {
        static Config load(String path) {
            var port = DEFAULT_PORT;
            if (path == null || path.isBlank()) return new Config(port);
            try {
                var m = new ObjectMapper().readValue(new File(path), Map.class);
                var p = m.get("port");
                if (p instanceof Number n) port = n.intValue();
            } catch (Exception e) {
                System.out.println("Failed to load config: " + e);
            }
            return new Config(port);
        }
    }

    // ===== main =====
    public static void main(String[] args) throws Exception {
        String cfgPath = null;
        for (var i = 0; i + 1 < args.length; i++)
            if ("--config".equals(args[i])) {
                cfgPath = args[i + 1];
                break;
            }
        var cfg = Config.load(cfgPath == null ? "./config.json" : cfgPath);

        var s = new UdpMasterServer(cfg.port());
        Runtime.getRuntime().addShutdownHook(new Thread(s::stop));
        s.start();
        System.out.println("master server is listening on UDP " + cfg.port());
    }
}
