package com.q3js.service.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ScoreboardPageResponse {

    @NotNull
    private ScoreboardPeriod period;

    @NotNull
    private Integer page;

    @NotNull
    private Integer pageSize;

    @NotNull
    private Integer totalEntries;

    @NotNull
    private Integer totalPages;

    @NotNull
    private Integer totalKills;

    @NotNull
    private Boolean hasPreviousPage;

    @NotNull
    private Boolean hasNextPage;

    @NotNull
    private List<ScoreboardEntryResponse> entries;
}
