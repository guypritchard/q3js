package com.q3js.master.weapon.service;

import com.q3js.master.weapon.domain.WeaponUsage;
import com.q3js.master.weapon.repository.WeaponRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotFoundException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class WeaponService {
    private static final Duration CACHE_DURATION = Duration.ofSeconds(30);
    private static final int LEADER_LIMIT = 5;
    private static final Map<String, WeaponDefinition> WEAPONS = Map.ofEntries(
        Map.entry("gauntlet", new WeaponDefinition("Gauntlet", List.of(2))),
        Map.entry("machinegun", new WeaponDefinition("Machinegun", List.of(3))),
        Map.entry("shotgun", new WeaponDefinition("Shotgun", List.of(1))),
        Map.entry("grenade-launcher", new WeaponDefinition("Grenade Launcher", List.of(4, 5))),
        Map.entry("rocket-launcher", new WeaponDefinition("Rocket Launcher", List.of(6, 7))),
        Map.entry("lightning-gun", new WeaponDefinition("Lightning Gun", List.of(11))),
        Map.entry("railgun", new WeaponDefinition("Railgun", List.of(10))),
        Map.entry("plasma-gun", new WeaponDefinition("Plasma Gun", List.of(8, 9))),
        Map.entry("bfg10k", new WeaponDefinition("BFG10K", List.of(12, 13)))
    );

    private final WeaponRepository repository;
    private final Map<String, CachedUsage> cache = new ConcurrentHashMap<>();

    public WeaponService(WeaponRepository repository) {
        this.repository = repository;
    }

    public WeaponUsage usage(String slug) {
        WeaponDefinition definition = WEAPONS.get(slug);
        if (definition == null) throw new NotFoundException("Unknown weapon: " + slug);

        OffsetDateTime now = currentTime();
        CachedUsage cached = cache.get(slug);
        if (cached != null && now.isBefore(cached.expiresAt())) return cached.usage();

        long kills = repository.countKills(definition.meansOfDeath());
        long allWeaponKills = repository.countAllWeaponKills();
        WeaponUsage usage = new WeaponUsage(
            slug,
            definition.name(),
            kills,
            repository.countUniquePlayers(definition.meansOfDeath()),
            allWeaponKills == 0 ? 0 : Math.round(kills * 10_000.0 / allWeaponKills) / 100.0,
            repository.leaders(definition.meansOfDeath(), LEADER_LIMIT)
        );
        cache.put(slug, new CachedUsage(usage, now.plus(CACHE_DURATION)));
        return usage;
    }

    protected OffsetDateTime currentTime() {
        return OffsetDateTime.now();
    }

    private record WeaponDefinition(String name, List<Integer> meansOfDeath) {
    }

    private record CachedUsage(WeaponUsage usage, OffsetDateTime expiresAt) {
    }
}
