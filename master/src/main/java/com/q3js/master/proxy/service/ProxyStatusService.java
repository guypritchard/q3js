package com.q3js.master.proxy.service;

import com.q3js.master.country.service.CountryService;
import com.q3js.master.proxy.domain.ProxyPlayer;
import com.q3js.master.proxy.domain.ProxyStatus;
import com.q3js.master.proxy.dto.ProxyStatusRequest;
import com.q3js.master.proxy.repository.ProxyStatusRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ForbiddenException;

import java.time.OffsetDateTime;
import java.util.Locale;

@ApplicationScoped
public class ProxyStatusService {
    private final ProxyStatusRepository repository;
    private final ProxySourceVerifier sourceVerifier;
    private final CountryService countryService;

    public ProxyStatusService(
        ProxyStatusRepository repository,
        ProxySourceVerifier sourceVerifier,
        CountryService countryService
    ) {
        this.repository = repository;
        this.sourceVerifier = sourceVerifier;
        this.countryService = countryService;
    }

    public void update(ProxyStatusRequest request, String sourceIp) {
        String host = request.host().trim();
        if (!repository.isRegistered(host, request.proxyPort())
            || !sourceVerifier.matches(host, sourceIp)) {
            throw new ForbiddenException("Proxy status source does not match a registered server.");
        }

        repository.upsert(new ProxyStatus(
            host,
            request.proxyPort(),
            request.players().stream().map(this::player).toList(),
            request.connections(),
            sourceIp,
            OffsetDateTime.now()
        ));
    }

    private ProxyPlayer player(ProxyStatusRequest.Player player) {
        String ip = player.ip().trim();
        String countryCode = player.countryCode();
        if (countryCode == null) {
            countryCode = countryService.lookup(ip).countryCode();
        }
        if (countryCode != null) {
            countryCode = countryCode.trim().toUpperCase(Locale.ROOT);
        }
        return new ProxyPlayer(ip, player.name().trim(), countryCode);
    }
}
