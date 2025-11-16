package com.q3js.service;

import com.q3js.domain.Server;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentSkipListSet;

@ApplicationScoped
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);

    private final Set<Server> servers;

    public ServerService() {
        this.servers = new ConcurrentSkipListSet<>(Comparator.comparing(Server::getTargetHost));
        addDefaultServers();
    }

    private void addDefaultServers() {
        this.servers.add(Server.builder()
                .proxyHost("server.q3js.com")
                .proxyPort(27961)
                .targetHost("server.q3js.com")
                .targetPort(27960)
                .build());
    }

    public List<Server> getAllServers() {
        return servers.stream().toList();
    }

    public void refreshServer(Server server) {
        LOG.infof("Adding server: %s", server);
        servers.add(server);
    }
}
