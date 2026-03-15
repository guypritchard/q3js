package com.q3js.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ServerInfoResponse {
    @NotNull
    private String id;

    @NotNull
    private String sv_hostname;

    @NotNull
    private String mapname;

    @NotNull
    private Integer g_gametype;

    @NotNull
    private Integer fraglimit;

    @NotNull
    private Integer timelimit;

    @NotNull
    private Integer sv_maxclients;

    @NotNull
    private Integer g_needpass;

    @NotNull
    private Integer capturelimit;

    @NotNull
    private String version;

    @NotNull
    private Integer players;

    @NotNull
    private Integer ping;

    @NotNull
    private Integer port;

    @NotNull
    private String challenge;

    @NotNull
    private Integer sv_maxPing;

    @NotNull
    private Integer sv_minPing;

    @NotNull
    private String com_gamename;

    @NotNull
    private Integer com_protocol;

    @NotNull
    private Integer dmflags;

    @NotNull
    private Integer sv_privateClients;

    @NotNull
    private Integer sv_minRate;

    @NotNull
    private Integer sv_maxRate;

    @NotNull
    private Integer sv_dlRate;

    @NotNull
    private Integer sv_floodProtect;

    @NotNull
    private Integer sv_allowDownload;

    @NotNull
    private Integer bot_minplayers;

    @NotNull
    private String gamename;

    @NotNull
    private Integer g_maxGameClients;

    @NotNull
    private String host;

    private Integer proxyPort;

    @NotNull
    private List<ServerUserResponse> users;
}
