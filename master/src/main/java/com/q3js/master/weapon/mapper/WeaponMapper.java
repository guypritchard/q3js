package com.q3js.master.weapon.mapper;

import com.q3js.master.weapon.domain.WeaponUsage;
import com.q3js.master.weapon.dto.WeaponLeaderResponse;
import com.q3js.master.weapon.dto.WeaponUsageResponse;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class WeaponMapper {
    public WeaponUsageResponse response(WeaponUsage usage) {
        return new WeaponUsageResponse(
            usage.slug(),
            usage.weaponName(),
            usage.kills(),
            usage.uniquePlayers(),
            usage.killShare(),
            usage.leaders().stream()
                .map(leader -> new WeaponLeaderResponse(leader.playerName(), leader.kills()))
                .toList()
        );
    }
}
