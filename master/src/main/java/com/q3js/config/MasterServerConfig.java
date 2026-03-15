package com.q3js.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

@ConfigMapping(prefix = "q3js")
public interface MasterServerConfig {
    ServerInfo serverInfo();

    interface ServerInfo {
        @WithDefault("3000")
        int timeoutMs();

        @WithDefault("https")
        String scheme();
    }
}
