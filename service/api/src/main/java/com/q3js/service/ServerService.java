package com.q3js.service;

import com.q3js.jooq.Tables;
import com.q3js.service.dto.ServerResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import java.util.List;

@RequiredArgsConstructor
@ApplicationScoped
public class ServerService {
    private final DSLContext dsl;

    @Transactional
    public List<ServerResponse> getAllServers() {
        return dsl.selectFrom(Tables.SERVER)
                .fetch(r -> {
                    return new ServerResponse(
                            r.getId(),
                            r.getName(),
                            r.getIpAddress(),
                            r.getPort(),
                            r.getStatus()
                    );
                });

    }
}
