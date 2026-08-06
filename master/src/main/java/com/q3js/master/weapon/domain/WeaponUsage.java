package com.q3js.master.weapon.domain;

import java.util.List;

public record WeaponUsage(
    String slug,
    String weaponName,
    long kills,
    long uniquePlayers,
    double killShare,
    List<WeaponLeader> leaders
) {
}
