package com.q3js.master.weapon.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(requiredProperties = {"slug", "weaponName", "kills", "uniquePlayers", "killShare", "leaders"})
public record WeaponUsageResponse(
    String slug,
    String weaponName,
    long kills,
    long uniquePlayers,
    double killShare,
    List<WeaponLeaderResponse> leaders
) {
}
