package com.q3js.service.client;

import com.q3js.service.dto.ServerInfoResponse;
import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ServerInfoClientTest {

    @Test
    void parseStatusResponseMapsRulesAndPlayers() {
        String rawStatus = """
                \u00ff\u00ff\u00ff\u00ffstatusResponse
                \\sv_hostname\\^1FFA ^724/7\\mapname\\q3dm17\\g_gametype\\0\\fraglimit\\30\\timelimit\\15\\sv_maxclients\\64\\g_needpass\\0\\capturelimit\\8\\version\\ioq3 1.36 linux-x86_64 Mar 11 2026\\challenge\\xxx\\sv_maxping\\500\\sv_minping\\0\\com_gamename\\Quake3Arena\\com_protocol\\71\\dmflags\\0\\sv_privateclients\\0\\sv_minrate\\0\\sv_maxrate\\0\\sv_dlrate\\0\\sv_floodprotect\\1\\sv_allowdownload\\1\\bot_minplayers\\0\\gamename\\baseq3\\g_maxgameclients\\0
                3 0 "Sarge"
                -4 0 "^2Visor"
                """;

        ServerInfoResponse response = ServerInfoClient.parseStatusResponse(rawStatus,
                new ServerInfoClient.StatusParseOptions("ffa.q3js.com", 27961, 27960, 42));

        assertEquals("ffa.q3js.com:27960", response.getId());
        assertEquals("FFA 24/7", response.getSv_hostname());
        assertEquals("q3dm17", response.getMapname());
        assertEquals(0, response.getG_gametype());
        assertEquals(30, response.getFraglimit());
        assertEquals(15, response.getTimelimit());
        assertEquals(64, response.getSv_maxclients());
        assertEquals(2, response.getPlayers());
        assertEquals(42, response.getPing());
        assertEquals(27960, response.getPort());
        assertEquals(27961, response.getProxyPort());
        assertEquals("Sarge", response.getUsers().get(0).getName());
        assertEquals("Visor", response.getUsers().get(1).getName());
    }

    @Test
    void parseStatusResponseReturnsNullForInvalidPayload() {
        assertNull(ServerInfoClient.parseStatusResponse("print\nmissing\n",
                new ServerInfoClient.StatusParseOptions("ffa.q3js.com", 27961, 27960, 0)));
    }

    @Test
    void buildWebSocketUriUsesWebSocketScheme() {
        ServerInfoClient client = new ServerInfoClient(TestConfig.http(), null);

        URI uri = client.buildWebSocketUri("ffa.q3js.com", 27961);

        assertEquals("ws://ffa.q3js.com:27961/", uri.toString());
    }

    private static final class TestConfig {
        static com.q3js.config.MasterServerConfig http() {
            return new com.q3js.config.MasterServerConfig() {
                @Override
                public ServerInfo serverInfo() {
                    return new ServerInfo() {
                        @Override
                        public int timeoutMs() {
                            return 3000;
                        }

                        @Override
                        public String scheme() {
                            return "http";
                        }
                    };
                }
            };
        }
    }
}
