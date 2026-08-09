package com.q3js.master.playerconnection.domain;

import java.util.List;

public record PlayerAddressPage(
    int page,
    int pageSize,
    int totalEntries,
    int totalPages,
    boolean hasPreviousPage,
    boolean hasNextPage,
    List<StoredPlayerAddress> entries
) {
}
