package com.q3js.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Objects;

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

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Server server = (Server) o;
        return proxyPort == server.proxyPort && targetPort == server.targetPort && Objects.equals(host, server.host);
    }

    @Override
    public int hashCode() {
        return Objects.hash(host, proxyPort, targetPort);
    }
}
