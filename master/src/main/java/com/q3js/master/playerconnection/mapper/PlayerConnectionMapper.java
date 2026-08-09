package com.q3js.master.playerconnection.mapper;

import com.q3js.master.playerconnection.domain.PlayerConnectionPage;
import com.q3js.master.playerconnection.domain.StoredPlayerConnection;
import com.q3js.master.playerconnection.dto.PlayerConnectionPageResponse;
import com.q3js.master.playerconnection.dto.PlayerConnectionResponse;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PlayerConnectionMapper {
    public PlayerConnectionPageResponse response(PlayerConnectionPage page) {
        return new PlayerConnectionPageResponse(
            page.page(),
            page.pageSize(),
            page.totalEntries(),
            page.totalPages(),
            page.hasPreviousPage(),
            page.hasNextPage(),
            page.entries().stream().map(this::response).toList()
        );
    }

    private PlayerConnectionResponse response(StoredPlayerConnection connection) {
        return new PlayerConnectionResponse(
            connection.id(),
            connection.sourceIp(),
            connection.clientIp(),
            connection.playerName(),
            connection.userinfo(),
            connection.serverHost(),
            connection.serverPort(),
            connection.receivedAt()
        );
    }
}
