package com.q3js.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ServerInfoResponse {
    private String id;
    private String sv_hostname;
    private String mapname;
    private Integer g_gametype;
    private Integer fraglimit;
    private Integer timelimit;
    private Integer sv_maxclients;
    private Integer g_needpass;
    private String fsGame;

    @Schema(nullable = true)
    private Integer capturelimit;

    @Schema(nullable = true)
    private String version;

    @Schema(nullable = true)
    private String location;

    private Integer players;

    @Schema(nullable = true)
    private Integer ping;

    @Schema(nullable = true)
    private String host;

    @Schema(nullable = true)
    private Integer port;

    @Schema(nullable = true)
    private String challenge;

    @Schema(nullable = true)
    private Integer sv_maxPing;

    @Schema(nullable = true)
    private Integer sv_minPing;

    @Schema(nullable = true)
    private String com_gamename;

    @Schema(nullable = true)
    private Integer com_protocol;

    @Schema(nullable = true)
    private Integer dmflags;

    @Schema(nullable = true)
    private Integer sv_privateClients;

    @Schema(nullable = true)
    private Integer sv_minRate;

    @Schema(nullable = true)
    private Integer sv_maxRate;

    @Schema(nullable = true)
    private Integer sv_dlRate;

    @Schema(nullable = true)
    private Integer sv_floodProtect;

    @Schema(nullable = true)
    private Integer sv_allowDownload;

    @Schema(nullable = true)
    private Integer bot_minplayers;

    @Schema(nullable = true)
    private String gamename;

    @Schema(nullable = true)
    private Integer g_maxGameClients;

    private List<ServerUserResponse> users;

    @Schema(nullable = true)
    private Integer proxyPort;

    @Schema(nullable = true)
    private Integer targetPort;
}
