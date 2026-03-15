package com.q3js.service.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ServerResponse {
    @NotNull
    private Long id;

    @NotNull
    private Boolean secure;
    
    @NotNull
    private String host;

    @NotNull
    private Integer proxyPort;

    private String targetHost;

    @NotNull
    private Integer targetPort;

    private String fsGame;
}
