#!/usr/bin/env python3
import json
import shlex
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ACCOUNT_ID = "91190eae0f8afb93caba9e8e5d56fa61"
ZONE_ID = "97f864d14cf101652939b341476e10fb"
TUNNEL_ID = "1d7541dc-7dfd-4a03-8fcf-a68ef3f273d0"
HOSTNAMES = ("q3js.amber-fly.org", "q3js-ffa.amber-fly.org")
ORIGIN = "http://192.168.7.11:80"
ENV_FILE = Path("/etc/default/cloudflared-api")


def environment() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        parsed = shlex.split(value, comments=True)
        values[key.strip()] = parsed[0] if parsed else ""
    return values


def request(token: str, method: str, path: str, body: object | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4/" + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Cloudflare API {method} {path} failed: {error.code} {detail}") from error
    if not result.get("success"):
        raise RuntimeError(f"Cloudflare API {method} {path} failed: {result.get('errors')}")
    return result


def desired_ingress(hostname: str) -> dict:
    return {
        "hostname": hostname,
        "originRequest": {"httpHostHeader": hostname},
        "service": ORIGIN,
    }


def ensure_dns(token: str, hostname: str, timestamp: str) -> None:
    dns_query = urllib.parse.urlencode({"type": "CNAME", "name": hostname})
    dns = request(token, "GET", f"zones/{ZONE_ID}/dns_records?{dns_query}")
    backup_name = hostname.replace(".", "-")
    Path(f"/root/cloudflare-dns.bak.{backup_name}-{timestamp}.json").write_text(
        json.dumps(dns, indent=2) + "\n", encoding="utf-8"
    )
    desired_dns = {
        "type": "CNAME",
        "name": hostname,
        "content": f"{TUNNEL_ID}.cfargotunnel.com",
        "proxied": True,
        "ttl": 1,
        "comment": "Q3JS on NAS Cloudflare Tunnel",
    }
    records = dns.get("result", [])
    if records:
        record = records[0]
        if record.get("content") != desired_dns["content"] or not record.get("proxied"):
            request(token, "PUT", f"zones/{ZONE_ID}/dns_records/{record['id']}", desired_dns)
            print(f"Updated DNS for {hostname}")
        else:
            print(f"DNS already configured for {hostname}")
    else:
        request(token, "POST", f"zones/{ZONE_ID}/dns_records", desired_dns)
        print(f"Created DNS for {hostname}")


def main() -> None:
    values = environment()
    token = values.get("CF_API_TOKEN")
    if not token:
        raise RuntimeError(f"CF_API_TOKEN is missing from {ENV_FILE}")
    if values.get("CF_ACCOUNT_ID", ACCOUNT_ID) != ACCOUNT_ID:
        raise RuntimeError("Cloudflare account ID does not match this deployment")
    if values.get("CF_TUNNEL_ID", TUNNEL_ID) != TUNNEL_ID:
        raise RuntimeError("Cloudflare tunnel ID does not match this deployment")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    for hostname in HOSTNAMES:
        ensure_dns(token, hostname, timestamp)

    tunnel_path = f"accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations"
    tunnel = request(token, "GET", tunnel_path)
    Path(f"/root/cloudflare-tunnel-config.bak.q3js-{timestamp}.json").write_text(
        json.dumps(tunnel, indent=2) + "\n", encoding="utf-8"
    )
    config = tunnel["result"]["config"]
    ingress = config["ingress"]
    changed = False
    messages: list[str] = []
    for hostname in HOSTNAMES:
        desired_rule = desired_ingress(hostname)
        existing = next((rule for rule in ingress if rule.get("hostname") == hostname), None)
        if existing is None:
            catch_all = next((index for index, rule in enumerate(ingress) if "hostname" not in rule), len(ingress))
            ingress.insert(catch_all, desired_rule)
            changed = True
            messages.append(f"Added tunnel ingress for {hostname}")
        elif existing != desired_rule:
            existing.clear()
            existing.update(desired_rule)
            changed = True
            messages.append(f"Updated tunnel ingress for {hostname}")
        else:
            messages.append(f"Tunnel ingress already configured for {hostname}")
    if changed:
        request(token, "PUT", tunnel_path, {"config": config})
    for message in messages:
        print(message)


if __name__ == "__main__":
    main()
