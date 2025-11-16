package com.q3js.udp;

import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import lombok.RequiredArgsConstructor;

@ApplicationScoped
@RequiredArgsConstructor
public class UdpServerBootstrap {
    private final UdpMasterServer server;

    void onStart(@Observes StartupEvent ev) throws Exception {
        server.start();
    }

    void onStop(@Observes ShutdownEvent ev) {
        server.stop();
    }
}
