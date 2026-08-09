package com.q3js.master.playerconnection.service;

import com.q3js.master.playerconnection.domain.PlayerConnection;
import com.q3js.master.playerconnection.domain.PlayerConnectionPage;
import com.q3js.master.playerconnection.dto.PlayerConnectionRequest;
import com.q3js.master.playerconnection.repository.PlayerConnectionRepository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.BadRequestException;

import java.net.InetAddress;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class PlayerConnectionService {
    private static final Set<String> PRIVATE_KEYS = Set.of("clientip", "ip", "password", "rconpassword");

    private final PlayerConnectionRepository repository;

    public PlayerConnectionService(PlayerConnectionRepository repository) {
        this.repository = repository;
    }

    public void ingest(PlayerConnectionRequest request, String sourceIp) {
        String clientIp = request.clientIp().trim();
        validateClientIp(clientIp);
        Map<String, String> userinfo = sanitizedUserinfo(request.userinfo());
        String decodedName = userinfo.entrySet().stream()
            .filter(entry -> entry.getKey().equalsIgnoreCase("name"))
            .map(Map.Entry::getValue)
            .findFirst()
            .orElseThrow(() -> new BadRequestException("Userinfo must contain the player name."));
        if (!decodedName.equals(request.playerName())) {
            throw new BadRequestException("Player name must match userinfo.");
        }

        repository.insert(
            new PlayerConnection(
                clientIp,
                request.playerName(),
                userinfo,
                request.serverHost().trim(),
                request.serverPort()
            ),
            sourceIp
        );
    }

    public PlayerConnectionPage connections(int requestedPage, int pageSize, String search) {
        int totalEntries = repository.count(search);
        int totalPages = Math.max(1, (int) Math.ceil(totalEntries / (double) pageSize));
        int page = Math.min(requestedPage, totalPages);
        int offset = (page - 1) * pageSize;
        return new PlayerConnectionPage(
            page,
            pageSize,
            totalEntries,
            totalPages,
            page > 1,
            page < totalPages,
            repository.find(search, pageSize, offset)
        );
    }

    private static void validateClientIp(String clientIp) {
        if (!clientIp.matches("[0-9A-Fa-f:.]+")) {
            throw new BadRequestException("Client IP address is invalid.");
        }
        try {
            InetAddress.getByName(clientIp);
        } catch (Exception ignored) {
            throw new BadRequestException("Client IP address is invalid.");
        }
    }

    private static Map<String, String> sanitizedUserinfo(Map<String, String> supplied) {
        Map<String, String> sanitized = new LinkedHashMap<>();
        supplied.forEach((key, value) -> {
            if (!PRIVATE_KEYS.contains(key.toLowerCase(Locale.ROOT))) {
                sanitized.put(key, value);
            }
        });
        return Collections.unmodifiableMap(sanitized);
    }
}
