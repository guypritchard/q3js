package com.q3js.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class Server {
    private String host;
    private int proxyPort;
    private int targetPort;
    private long lastUpdated;
    private boolean permanent;
}
