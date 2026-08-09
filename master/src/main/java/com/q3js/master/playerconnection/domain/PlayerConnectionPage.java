package com.q3js.master.playerconnection.domain;

import java.util.List;

public record PlayerConnectionPage(
    int page,
    int pageSize,
    int totalEntries,
    int totalPages,
    boolean hasPreviousPage,
    boolean hasNextPage,
    List<StoredPlayerConnection> entries
) {
}
