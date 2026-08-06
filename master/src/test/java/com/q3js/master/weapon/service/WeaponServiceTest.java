package com.q3js.master.weapon.service;

import com.q3js.master.weapon.domain.WeaponLeader;
import com.q3js.master.weapon.repository.WeaponRepository;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WeaponServiceTest {
    @Test
    void combinesDirectAndSplashKillsIntoUsageShare() {
        WeaponRepository repository = mock(WeaponRepository.class);
        List<Integer> rocketModes = List.of(6, 7);
        when(repository.countKills(rocketModes)).thenReturn(250L);
        when(repository.countAllWeaponKills()).thenReturn(1_000L);
        when(repository.countUniquePlayers(rocketModes)).thenReturn(20L);
        when(repository.leaders(rocketModes, 5)).thenReturn(List.of(new WeaponLeader("Ranger", 50)));

        WeaponService service = new FixedTimeWeaponService(repository);
        var usage = service.usage("rocket-launcher");

        assertEquals(250, usage.kills());
        assertEquals(20, usage.uniquePlayers());
        assertEquals(25.0, usage.killShare());
        assertEquals("Ranger", usage.leaders().get(0).playerName());
        verify(repository).countKills(rocketModes);
    }

    @Test
    void rejectsUnknownWeapon() {
        WeaponService service = new WeaponService(mock(WeaponRepository.class));
        assertThrows(NotFoundException.class, () -> service.usage("blaster"));
    }

    private static final class FixedTimeWeaponService extends WeaponService {
        private FixedTimeWeaponService(WeaponRepository repository) {
            super(repository);
        }

        @Override
        protected OffsetDateTime currentTime() {
            return OffsetDateTime.parse("2026-08-07T12:00:00Z");
        }
    }
}
