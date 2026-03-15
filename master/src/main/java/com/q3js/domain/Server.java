package com.q3js.domain;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class Server {
    @NotNull
    private Long id;

    @NotNull
    private Integer displayOrder;

    @NotNull
    private Boolean permanent;

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
