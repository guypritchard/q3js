package com.q3js.service.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class ServerResponse {
    private String host;
    private Integer proxyPort;
    private Integer targetPort;

    @NotNull
    private Boolean secure;

    @NotNull
    private ServerInfoResponse info;
}
