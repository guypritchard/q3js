package com.q3js.http.service.dto;

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
    private Integer id;

    @NotNull
    private String name;

    @NotNull
    private String ipAddress;

    @NotNull
    private Integer port;

    @NotNull
    private String status;
}
