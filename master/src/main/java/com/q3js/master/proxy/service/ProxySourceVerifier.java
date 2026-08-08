package com.q3js.master.proxy.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;

@ApplicationScoped
public class ProxySourceVerifier {
    public boolean matches(String registeredHost, String sourceIp) {
        if (sourceIp == null || sourceIp.isBlank()) {
            return false;
        }

        try {
            InetAddress source = InetAddress.getByName(sourceIp);
            return Arrays.stream(InetAddress.getAllByName(registeredHost))
                .anyMatch(address -> address.equals(source));
        } catch (UnknownHostException exception) {
            return false;
        }
    }
}
