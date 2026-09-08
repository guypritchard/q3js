package com.q3js.master.server.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {
    "id", "gatewayUrl", "hosted", "host", "proxyPort", "targetPort", "secure", "official", "info"
})
public record ServerResponse(
    String id,
    String gatewayUrl,
    boolean hosted,
    String host,
    int proxyPort,
    int targetPort,
    boolean secure,
    boolean official,
    ServerInfo info
) {
}
