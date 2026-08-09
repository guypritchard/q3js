package com.q3js.master.playerconnection.domain;

import java.util.Map;

public record PlayerConnection(
    String clientIp,
    String playerName,
    Map<String, String> userinfo,
    String serverHost,
    int serverPort
) {
}
