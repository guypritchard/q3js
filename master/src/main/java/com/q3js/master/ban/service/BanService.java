package com.q3js.master.ban.service;

import com.q3js.master.ban.domain.Ban;
import com.q3js.master.ban.dto.BanRequest;
import com.q3js.master.ban.repository.BanRepository;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

import static com.q3js.master.country.service.IpAddressNormalizer.normalize;

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
        return repository.ban(normalize(request.ipAddress()));
    }

    public void unban(String ipAddress) {
        repository.unban(normalize(ipAddress));
    }
}
