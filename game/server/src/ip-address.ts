import { isIP } from "node:net";

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
