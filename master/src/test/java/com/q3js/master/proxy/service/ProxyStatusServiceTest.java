package com.q3js.master.proxy.service;

import com.q3js.master.country.domain.CountryLookup;
import com.q3js.master.country.service.CountryService;
import com.q3js.master.proxy.domain.ProxyStatus;
import com.q3js.master.proxy.dto.ProxyStatusRequest;
import com.q3js.master.proxy.repository.ProxyStatusRepository;
import jakarta.ws.rs.ForbiddenException;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProxyStatusServiceTest {
    @Test
    void storesPlayerRosterAndResolvesMissingCountry() {
        var repository = new StubRepository(true);
        var service = new ProxyStatusService(
            repository,
            new StubSourceVerifier(true),
            new StubCountryService("US")
        );

        service.update(request(null), "127.0.0.1");

        ProxyStatus status = repository.stored;
        assertEquals("game.example.com", status.host());
        assertEquals(27961, status.proxyPort());
        assertEquals(3, status.connections());
        assertEquals("127.0.0.1", status.sourceIp());
        assertEquals(1, status.players().size());
        assertEquals("203.0.113.10", status.players().get(0).ip());
        assertEquals("Ranger", status.players().get(0).name());
        assertEquals("US", status.players().get(0).countryCode());
    }

    @Test
    void preservesAndNormalizesCountryReportedByProxy() {
        var repository = new StubRepository(true);
        var service = new ProxyStatusService(
            repository,
            new StubSourceVerifier(true),
            new StubCountryService("US")
        );

        service.update(request("rs"), "127.0.0.1");

        assertEquals("RS", repository.stored.players().get(0).countryCode());
    }

    @Test
    void rejectsUnregisteredOrMismatchedSources() {
        var unregisteredRepository = new StubRepository(false);
        var unregistered = new ProxyStatusService(
            unregisteredRepository,
            new StubSourceVerifier(true),
            new StubCountryService("US")
        );
        assertThrows(ForbiddenException.class, () -> unregistered.update(request(null), "127.0.0.1"));
        assertTrue(unregisteredRepository.stored == null);

        var mismatchedRepository = new StubRepository(true);
        var mismatched = new ProxyStatusService(
            mismatchedRepository,
            new StubSourceVerifier(false),
            new StubCountryService("US")
        );
        assertThrows(ForbiddenException.class, () -> mismatched.update(request(null), "127.0.0.2"));
        assertTrue(mismatchedRepository.stored == null);
    }

    private ProxyStatusRequest request(String countryCode) {
        return new ProxyStatusRequest(
            " game.example.com ",
            27961,
            List.of(new ProxyStatusRequest.Player(" 203.0.113.10 ", " Ranger ", countryCode)),
            3
        );
    }

    private static final class StubRepository extends ProxyStatusRepository {
        private final boolean registered;
        private ProxyStatus stored;

        private StubRepository(boolean registered) {
            super(null);
            this.registered = registered;
        }

        @Override
        public boolean isRegistered(String host, int proxyPort) {
            return registered;
        }

        @Override
        public void upsert(ProxyStatus status) {
            stored = status;
        }
    }

    private static final class StubSourceVerifier extends ProxySourceVerifier {
        private final boolean matches;

        private StubSourceVerifier(boolean matches) {
            this.matches = matches;
        }

        @Override
        public boolean matches(String registeredHost, String sourceIp) {
            return matches;
        }
    }

    private static final class StubCountryService extends CountryService {
        private final String countryCode;

        private StubCountryService(String countryCode) {
            super(Path.of("missing"), "missing", Optional.empty());
            this.countryCode = countryCode;
        }

        @Override
        public CountryLookup lookup(String ipAddress) {
            return new CountryLookup(ipAddress, countryCode, null);
        }
    }
}
