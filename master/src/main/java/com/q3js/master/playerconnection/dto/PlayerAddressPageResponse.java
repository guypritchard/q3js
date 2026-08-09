package com.q3js.master.playerconnection.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(requiredProperties = {
    "page", "pageSize", "totalEntries", "totalPages", "hasPreviousPage", "hasNextPage", "entries"
})
public record PlayerAddressPageResponse(
    int page,
    int pageSize,
    int totalEntries,
    int totalPages,
    boolean hasPreviousPage,
    boolean hasNextPage,
    List<PlayerAddressResponse> entries
) {
}
