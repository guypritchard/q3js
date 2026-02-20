package com.q3js.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ServerResponse {
    private String id;
    private String sv_hostname;
    private String mapname;
    private Integer g_gametype;
    private Integer fraglimit;
    private Integer timelimit;
    private Integer sv_maxclients;
    private Integer g_needpass;
    private Integer capturelimit;
    private String version;
    private String location;
    private Integer players;
    private Integer ping;
    private String host;
    private Integer port;
    private String challenge;
    private Integer sv_maxPing;
    private Integer sv_minPing;
    private String com_gamename;
    private Integer com_protocol;
    private Integer dmflags;
    private Integer sv_privateClients;
    private Integer sv_minRate;
    private Integer sv_maxRate;
    private Integer sv_dlRate;
    private Integer sv_floodProtect;
    private Integer sv_allowDownload;
    private Integer bot_minplayers;
    private String gamename;
    private Integer g_maxGameClients;
    private List<ServerUserResponse> users;
    private Integer proxyPort;
    private Integer targetPort;
}
