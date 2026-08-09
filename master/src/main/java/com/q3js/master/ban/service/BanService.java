package com.q3js.master.ban.service;

import com.q3js.master.ban.domain.Ban;
import com.q3js.master.ban.dto.BanRequest;
import com.q3js.master.ban.repository.BanRepository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.BadRequestException;

import java.net.InetAddress;
import java.util.List;

@ApplicationScoped
public class BanService {
    private final BanRepository repository;

    public BanService(BanRepository repository) {
        this.repository = repository;
    }

    public List<Ban> bans() {
        return repository.findAll();
    }

    public Ban ban(BanRequest request) {
        return repository.upsert(normalizedIp(request.ipAddress()), request.playerName());
    }

    public void unban(String ipAddress) {
        repository.delete(normalizedIp(ipAddress));
    }

    private static String normalizedIp(String supplied) {
        String ipAddress = supplied == null ? "" : supplied.trim();
        if (!ipAddress.matches("[0-9A-Fa-f:.]+")) {
            throw new BadRequestException("IP address is invalid.");
        }
        try {
            return InetAddress.getByName(ipAddress).getHostAddress();
        } catch (Exception ignored) {
            throw new BadRequestException("IP address is invalid.");
        }
    }
}
