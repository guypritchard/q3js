package com.q3js.master.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.browserhost.service.BrowserHostRegistry;
import com.q3js.master.server.client.ServerStatusClient;
import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.domain.StoredServer;
import com.q3js.master.server.dto.ServerInfo;
import com.q3js.master.server.dto.ServerResponse;
import com.q3js.master.server.repository.ServerRepository;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ServerServiceTest {
    @Test
    void addsPieterAsASecureCommunityServerBeforeRefreshing() {
        var repository = new ServerRepository(null) {
            private RegisteredServer inserted;

            @Override
            public boolean insertIfMissing(RegisteredServer server) {
                inserted = server;
                return true;
            }

            @Override
            public List<StoredServer> findAll() {
                return List.of();
            }
        };
        ServerService service = new ServerService(
            repository,
            new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(1)),
            new ObjectMapper(),
            emptyBrowserHosts(),
            Duration.ofMinutes(2)
        );

        service.refreshServers();

        assertEquals("q3.pieter.com", repository.inserted.host());
        assertEquals(443, repository.inserted.proxyPort());
        assertEquals(0, repository.inserted.targetPort());
        assertTrue(repository.inserted.secure());
        assertFalse(repository.inserted.official());
    }

    @Test
    void listsOfficialServersBeforeCommunityServersRegardlessOfPlayerCount() {
        OffsetDateTime now = OffsetDateTime.now();
        List<StoredServer> storedServers = List.of(
            new StoredServer(
                new RegisteredServer("community.example.com", 27961, 27960, true, false, now),
                "{\"sv_hostname\":\"Community\",\"players\":2,\"users\":["
                    + "{\"score\":10,\"ping\":25,\"name\":\"Player One\"},"
                    + "{\"score\":5,\"ping\":30,\"name\":\"Player Two\"}]}",
                now
            ),
            new StoredServer(
                new RegisteredServer("official.example.com", 27961, 27960, true, true, now),
                "{\"sv_hostname\":\"Official\",\"players\":0,\"users\":[]}",
                now
            )
        );
        ServerRepository repository = new ServerRepository(null) {
            @Override
            public List<StoredServer> findAll() {
                return storedServers;
            }
        };
        ServerService service = new ServerService(
            repository,
            new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(1)),
            new ObjectMapper(),
            emptyBrowserHosts(),
            Duration.ofMinutes(2)
        );

        assertEquals(
            List.of("official.example.com", "community.example.com"),
            service.servers().stream().map(server -> server.host()).toList()
        );
    }

    @Test
    void listsOfficialFfaBeforeCtfWhenRealPlayerCountsAreEqual() {
        OffsetDateTime now = OffsetDateTime.now();
        List<StoredServer> storedServers = List.of(
            new StoredServer(
                new RegisteredServer("ctf.example.com", 27961, 27960, true, true, now),
                "{\"sv_hostname\":\"CTF\",\"g_gametype\":4,\"players\":2,\"users\":["
                    + "{\"score\":10,\"ping\":25,\"name\":\"Human\"},"
                    + "{\"score\":5,\"ping\":0,\"name\":\"Bot\"}]}",
                now
            ),
            new StoredServer(
                new RegisteredServer("ffa.example.com", 27961, 27960, true, true, now),
                "{\"sv_hostname\":\"FFA\",\"g_gametype\":0,\"players\":1,\"users\":["
                    + "{\"score\":10,\"ping\":30,\"name\":\"Human\"}]}",
                now
            )
        );
        ServerRepository repository = new ServerRepository(null) {
            @Override
            public List<StoredServer> findAll() {
                return storedServers;
            }
        };
        ServerService service = new ServerService(
            repository,
            new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(1)),
            new ObjectMapper(),
            emptyBrowserHosts(),
            Duration.ofMinutes(2)
        );

        assertEquals(
            List.of("ffa.example.com", "ctf.example.com"),
            service.servers().stream().map(server -> server.host()).toList()
        );
    }

    @Test
    void mergesBrowserHostedGamesAndUsesTheirStableIds() {
        ServerRepository repository = new ServerRepository(null) {
            @Override
            public List<StoredServer> findAll() {
                return List.of();
            }
        };
        BrowserHostRegistry browserHosts = mock(BrowserHostRegistry.class);
        ServerInfo info = new ServerInfo(
            "browser", "Hosted", "q3dm17", 0, 20, 15, 16, 0, "", 0, "", "", 0, 0,
            "browser", 27960, "", 0, 0, "Quake3Arena", 68, 0, 0, 0, 0, 0, 0, 0, 0,
            "baseq3", 0, List.of(), 443, 27960
        );
        ServerResponse hosted = new ServerResponse(
            "browser:abc123", "wss://master.example/api/hosted-games/abc123/ws", true,
            "browser", 443, 27960, true, false, info
        );
        when(browserHosts.servers()).thenReturn(List.of(hosted));
        ServerService service = new ServerService(
            repository,
            new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(1)),
            new ObjectMapper(),
            browserHosts,
            Duration.ofMinutes(2)
        );

        assertEquals(List.of(hosted), service.servers());
        assertTrue(service.isListedServer("browser:abc123"));
        assertFalse(service.isListedServer("browser:443"));
    }

    private static BrowserHostRegistry emptyBrowserHosts() {
        BrowserHostRegistry browserHosts = mock(BrowserHostRegistry.class);
        when(browserHosts.servers()).thenReturn(List.of());
        return browserHosts;
    }
}
