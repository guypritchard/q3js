package com.q3js.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class Server {
    private String host;
    private int proxyPort;
    private int targetPort;
    private boolean secure;

    private OffsetDateTime lastHeartbeat;
}
