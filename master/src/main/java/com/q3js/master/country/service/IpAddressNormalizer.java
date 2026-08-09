package com.q3js.master.country.service;

import jakarta.ws.rs.BadRequestException;

import java.net.InetAddress;

public final class IpAddressNormalizer {
    private IpAddressNormalizer() {
    }

    public static String normalize(String supplied) {
        String ipAddress = supplied == null ? "" : supplied.trim();
        if (!ipAddress.matches("[0-9A-Fa-f:.]+")) {
            throw new BadRequestException("IP address is invalid.");
        }
        try {
            byte[] bytes = InetAddress.getByName(ipAddress).getAddress();
            if (bytes.length == 4) {
                return InetAddress.getByAddress(bytes).getHostAddress();
            }
            return compressedIpv6(bytes);
        } catch (Exception ignored) {
            throw new BadRequestException("IP address is invalid.");
        }
    }

    private static String compressedIpv6(byte[] bytes) {
        int[] groups = new int[8];
        for (int index = 0; index < groups.length; index++) {
            groups[index] = (Byte.toUnsignedInt(bytes[index * 2]) << 8)
                | Byte.toUnsignedInt(bytes[index * 2 + 1]);
        }

        int longestStart = -1;
        int longestLength = 0;
        for (int index = 0; index < groups.length;) {
            if (groups[index] != 0) {
                index++;
                continue;
            }
            int start = index;
            while (index < groups.length && groups[index] == 0) {
                index++;
            }
            int length = index - start;
            if (length >= 2 && length > longestLength) {
                longestStart = start;
                longestLength = length;
            }
        }

        StringBuilder normalized = new StringBuilder();
        for (int index = 0; index < groups.length;) {
            if (index == longestStart) {
                normalized.append("::");
                index += longestLength;
                continue;
            }
            if (!normalized.isEmpty() && normalized.charAt(normalized.length() - 1) != ':') {
                normalized.append(':');
            }
            normalized.append(Integer.toHexString(groups[index]));
            index++;
        }
        return normalized.toString();
    }
}
