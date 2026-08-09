package com.q3js.master.ban.service;

import com.q3js.master.ban.dto.BanRequest;
import com.q3js.master.ban.repository.BanRepository;

import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BanServiceTest {
    @Test
    void normalizesEquivalentIpv6AddressesForBanOperations() {
        var repository = mock(BanRepository.class);
        var service = new BanService(repository);

        service.ban(new BanRequest("2001:db8::7", "Ranger"));
        service.unban("2001:0db8:0:0:0:0:0:7");

        verify(repository).upsert("2001:db8:0:0:0:0:0:7", "Ranger");
        verify(repository).delete("2001:db8:0:0:0:0:0:7");
    }

    @Test
    void rejectsInvalidIpAddresses() {
        var service = new BanService(mock(BanRepository.class));

        assertThrows(BadRequestException.class, () -> service.unban("999.999.999.999"));
    }
}
