import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";

/** Return a stable representation suitable for exact IP-address comparisons. */
export function normalizeIpAddress(address: string): string {
  const trimmed = address.trim();
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  if (mappedIpv4?.[1] && isIP(mappedIpv4[1]) === 4) {
    return mappedIpv4[1];
  }
  const version = isIP(trimmed);
  if (version === 4) {
    return trimmed;
  }
  if (version === 6) {
    return new URL(`http://[${trimmed}]`).hostname.slice(1, -1);
  }
  throw new Error("Invalid IP address.");
}

/** Resolve the peer through exactly the configured number of trusted proxies. */
export function clientIpAddress(request: IncomingMessage, trustedProxyHops: number): string {
  const peerAddress = request.socket.remoteAddress;
  if (!peerAddress) throw new Error("WebSocket peer address is unavailable.");
  if (trustedProxyHops === 0) return normalizeIpAddress(peerAddress);
  const forwardedHeader = request.headers["x-forwarded-for"];
  const forwarded = (Array.isArray(forwardedHeader) ? forwardedHeader.join(",") : forwardedHeader)
    ?.split(",")
    .map((address) => normalizeIpAddress(address.trim()));
  const address = forwarded?.[(forwarded?.length ?? 0) - trustedProxyHops];
  if (!address || isIP(address) === 0) throw new Error("A trusted proxy did not provide a valid X-Forwarded-For chain.");
  return address;
}
