package com.q3js.master.weapon.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"playerName", "kills"})
public record WeaponLeaderResponse(String playerName, long kills) {
}
