package com.q3js.service;

import com.q3js.domain.Server;
import jakarta.enterprise.context.ApplicationScoped;
import io.quarkus.scheduler.Scheduled;
import org.jboss.logging.Logger;

import java.net.InetAddress;
import java.time.Instant;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentSkipListSet;

@ApplicationScoped
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);

    private static final long TIMEOUT_MS = 15_000;

    private final Set<Server> servers;

    private static final Comparator<Server> SERVER_COMPARATOR =
            Comparator.comparing(Server::isPermanent, Comparator.reverseOrder())
                    .thenComparing(Server::getHost, Comparator.nullsFirst(String::compareToIgnoreCase))
                    .thenComparingInt(Server::getProxyPort)
                    .thenComparingInt(Server::getTargetPort);


    public ServerService() {
        this.servers = new ConcurrentSkipListSet<>(SERVER_COMPARATOR);
        addDefaultServers();
    }

    private void addDefaultServers() {
        this.servers.add(Server.builder()
                .proxyPort(80)
                .host("ffa.q3js.com")
                .targetPort(27960)
                .permanent(true)
                .lastUpdated(Instant.now().toEpochMilli())
                .build());
    }

    public List<Server> getAllServers() {
        return servers.stream().toList();
    }

    public void refreshServer(Server server) {
        if (isLocalAddress(server.getHost())) {
            LOG.warnf("Ignoring server with local proxy host: %s", server.getHost());
            return;
        }

        // update timestamp before storing
        server.setLastUpdated(Instant.now().toEpochMilli());

        LOG.infof("Refreshing server: %s", server);
        servers.remove(server); // remove old instance if exists
        servers.add(server);
    }

    @Scheduled(every = "5s")
    void cleanup() {
        long now = Instant.now().toEpochMilli();
        long cutoff = now - TIMEOUT_MS;

        Iterator<Server> it = servers.iterator();

        while (it.hasNext()) {
            Server s = it.next();

            if (s.isPermanent()) continue;
            if (s.getLastUpdated() < cutoff) {
                LOG.infof("Removing stale server: %s", s);
                it.remove();
            }
        }
    }

    private boolean isLocalAddress(String host) {
        if (host == null || host.isBlank()) return true;

        host = host.trim().toLowerCase();

        try {
            var addr = InetAddress.getByName(host);
            return addr.isSiteLocalAddress();
        } catch (Exception e) {
            return true;
        }
    }
}
