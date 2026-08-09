package com.q3js.master.playerconnection.mapper;

import com.q3js.master.playerconnection.domain.PlayerAddressPage;
import com.q3js.master.playerconnection.domain.StoredPlayerAddress;
import com.q3js.master.playerconnection.dto.PlayerAddressNameResponse;
import com.q3js.master.playerconnection.dto.PlayerAddressPageResponse;
import com.q3js.master.playerconnection.dto.PlayerAddressResponse;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PlayerConnectionMapper {
    public PlayerAddressPageResponse response(PlayerAddressPage page) {
        return new PlayerAddressPageResponse(
            page.page(),
            page.pageSize(),
            page.totalEntries(),
            page.totalPages(),
            page.hasPreviousPage(),
            page.hasNextPage(),
            page.entries().stream().map(this::response).toList()
        );
    }

    private PlayerAddressResponse response(StoredPlayerAddress address) {
        return new PlayerAddressResponse(
            address.ipAddress(),
            address.names().stream().map(name -> new PlayerAddressNameResponse(
                name.playerName(),
                name.connectionCount(),
                name.firstSeenAt(),
                name.lastSeenAt()
            )).toList(),
            address.sourceIp(),
            address.userinfo(),
            address.serverHost(),
            address.serverPort(),
            address.connectionCount(),
            address.firstSeenAt(),
            address.lastSeenAt(),
            address.bannedAt()
        );
    }
}
