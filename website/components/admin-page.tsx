"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Prohibit,
  ShieldCheck,
  SignOut,
} from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { Button } from "@/components/ui/button";
import {
  adminTokenExpiresAt,
  adminTokenServerSnapshot,
  adminTokenSnapshot,
  clearAdminToken,
  storeAdminToken,
  subscribeAdminToken,
} from "@/lib/admin-auth";
import { client } from "@/lib/api/client";
import { banPlayer, getAdminBans, getPlayerConnections, loginAdmin, unbanPlayer } from "@/lib/api/generated/sdk.gen";
import type { BanResponse, PlayerConnectionPageResponse, PlayerConnectionResponse } from "@/lib/api/generated/types.gen";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function ipKey(value: string): string {
  const address = value.trim().toLowerCase();
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (mappedIpv4?.[1]) return mappedIpv4[1];
  if (!address.includes(":")) return address;
  try {
    return new URL(`http://[${address}]`).hostname.slice(1, -1);
  } catch {
    return address;
  }
}

function Userinfo({ connection }: Readonly<{ connection: PlayerConnectionResponse }>) {
  const entries = Object.entries(connection.userinfo).sort(([first], [second]) => first.localeCompare(second));
  return (
    <details className="group min-w-44">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.05em] text-primary hover:text-foreground">
        {entries.length} fields
      </summary>
      <dl className="mt-3 grid max-h-64 min-w-64 gap-1 overflow-auto border border-border/60 bg-background/70 p-3 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-3 border-b border-border/30 py-1 last:border-0">
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="break-all text-right text-foreground">{value || <span className="text-muted-foreground">empty</span>}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function AdminLogin() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await loginAdmin({
        client,
        body: { password },
        throwOnError: false,
      });
      if (!result.data) {
        setError(result.response?.status === 401 ? "Invalid administrator password." : "Login failed. Try again.");
        return;
      }
      storeAdminToken(result.data.access_token);
      setPassword("");
    } catch {
      setError("The master server could not be reached.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl items-center justify-center px-4 py-12">
      <section className="w-full max-w-md border border-border/70 bg-card/45 p-6 sm:p-8" aria-labelledby="admin-login-title">
        <div className="flex size-11 items-center justify-center border border-primary/50 bg-primary/10 text-primary">
          <ShieldCheck className="size-6" weight="bold" />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-primary">Restricted access</p>
        <h1 id="admin-login-title" className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.035em]">Admin login</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Authenticate with the master administrator password to inspect recorded player connections.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              maxLength={512}
              required
              autoFocus
              className="mt-2 h-11 w-full border border-border/70 bg-input px-3 font-mono text-sm focus:outline-2 focus:outline-ring"
            />
          </label>
          {error && <p role="alert" className="border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-foreground">{error}</p>}
          <Button type="submit" size="lg" disabled={submitting || !password} className="w-full">
            {submitting ? "Authenticating..." : "Authenticate"}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          The signed JWT is stored in this browser&apos;s local storage. The password is never stored.
        </p>
      </section>
    </main>
  );
}

export function AdminPage() {
  const token = useSyncExternalStore(subscribeAdminToken, adminTokenSnapshot, adminTokenServerSnapshot);
  const [connections, setConnections] = useState<PlayerConnectionPageResponse>();
  const [bans, setBans] = useState<BanResponse[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [changingBanIp, setChangingBanIp] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const bannedIps = useMemo(() => new Set(bans.map((ban) => ipKey(ban.ipAddress))), [bans]);

  const logout = useCallback(() => {
    clearAdminToken();
    setConnections(undefined);
    setBans([]);
    setError(undefined);
    setNotice(undefined);
  }, []);

  useEffect(() => {
    if (!token) return;
    const expiresAt = adminTokenExpiresAt(token);
    if (!expiresAt) return;
    const delay = expiresAt - Date.now();
    const timer = window.setTimeout(logout, Math.max(0, Math.min(delay, 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [logout, token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const [connectionsResult, bansResult] = await Promise.all([
          getPlayerConnections({
            client,
            query: { page, pageSize: 50, search: search || undefined },
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            throwOnError: false,
          }),
          getAdminBans({
            client,
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            throwOnError: false,
          }),
        ]);
        if (controller.signal.aborted) return;
        if (!connectionsResult.data || !bansResult.data) {
          const status = connectionsResult.response?.status ?? bansResult.response?.status;
          if (status === 401 || status === 403) {
            logout();
          } else {
            setError("Could not load player connections and ban status.");
          }
          return;
        }
        setConnections(connectionsResult.data);
        setBans(bansResult.data);
      } catch {
        if (!controller.signal.aborted) setError("The master server could not be reached.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [logout, page, refresh, search, token]);

  if (!token) {
    return <AdminLogin />;
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const banConnection = async (connection: PlayerConnectionResponse) => {
    const confirmed = window.confirm(
      `Ban ${connection.playerName} at ${connection.clientIp}?\n\nNew WebSocket connections from this IP will be rejected after gateways refresh their ban lists.`,
    );
    if (!confirmed) return;

    setChangingBanIp(connection.clientIp);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await banPlayer({
        client,
        body: { ipAddress: connection.clientIp, playerName: connection.playerName },
        headers: { Authorization: `Bearer ${token}` },
        throwOnError: false,
      });
      if (!result.data) {
        if (result.response?.status === 401 || result.response?.status === 403) {
          logout();
        } else {
          setError(`Could not ban ${connection.playerName}.`);
        }
        return;
      }
      setBans((current) => {
        const key = ipKey(result.data.ipAddress);
        return [...current.filter((ban) => ipKey(ban.ipAddress) !== key), result.data];
      });
      setNotice(`${connection.playerName} (${connection.clientIp}) is now banned.`);
    } catch {
      setError("The master server could not be reached.");
    } finally {
      setChangingBanIp(undefined);
    }
  };

  const unbanConnection = async (connection: PlayerConnectionResponse) => {
    const confirmed = window.confirm(
      `Unban ${connection.playerName} at ${connection.clientIp}?\n\nGateways will allow new WebSocket connections from this IP after their next ban-list refresh.`,
    );
    if (!confirmed) return;

    setChangingBanIp(connection.clientIp);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await unbanPlayer({
        client,
        path: { ipAddress: connection.clientIp },
        headers: { Authorization: `Bearer ${token}` },
        throwOnError: false,
      });
      if (result.response?.status !== 204) {
        if (result.response?.status === 401 || result.response?.status === 403) {
          logout();
        } else {
          setError(`Could not unban ${connection.playerName}.`);
        }
        return;
      }
      const key = ipKey(connection.clientIp);
      setBans((current) => current.filter((ban) => ipKey(ban.ipAddress) !== key));
      setNotice(`${connection.playerName} (${connection.clientIp}) is no longer banned.`);
    } catch {
      setError("The master server could not be reached.");
    } finally {
      setChangingBanIp(undefined);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-7xl px-4 pb-16 pt-8 sm:pt-10">
      <header className="flex flex-col gap-5 border-b border-border/60 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Master administration / Player audit</p>
          <h1 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.035em] md:text-4xl">Player connections</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Accepted connections reported by trusted Q3JS gateways. Userinfo is sanitized before storage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
            <ArrowClockwise className={loading ? "animate-spin" : undefined} /> Refresh
          </Button>
          <Button type="button" variant="ghost" onClick={logout}><SignOut /> Logout</Button>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Connection summary">
        <div className="border border-border/60 bg-card/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Matching records</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{connections?.totalEntries ?? "—"}</p>
        </div>
        <div className="border border-border/60 bg-card/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Page</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{connections ? `${connections.page} / ${connections.totalPages}` : "—"}</p>
        </div>
        <div className="border border-border/60 bg-card/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Ban enforcement</p>
          <p className="mt-1 text-sm font-semibold text-primary">Active · {bans.length} banned IP{bans.length === 1 ? "" : "s"}</p>
        </div>
      </section>

      <form onSubmit={submitSearch} className="mt-4 flex flex-col gap-2 border border-border/60 bg-card/35 p-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search players, IP addresses, or servers</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={128}
            placeholder="Search player, client IP, or server host"
            className="h-10 w-full bg-input pl-9 pr-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-2 focus:outline-ring"
          />
        </label>
        <Button type="submit" className="h-10 px-5">Search</Button>
        {search && (
          <Button type="button" variant="ghost" className="h-10" onClick={() => {
            setSearchDraft("");
            setSearch("");
            setPage(1);
          }}>Clear</Button>
        )}
      </form>

      {error && <p role="alert" className="mt-4 border border-primary/50 bg-primary/10 px-4 py-3 text-sm">{error}</p>}
      {notice && <p role="status" className="mt-4 border border-border/70 bg-card/60 px-4 py-3 text-sm">{notice}</p>}

      <div className="mt-4 overflow-x-auto border border-border/60 bg-card/35" aria-busy={loading}>
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-card/75 text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium">Client IP</th>
              <th className="px-4 py-3 font-medium">Server</th>
              <th className="px-4 py-3 font-medium">Connected</th>
              <th className="px-4 py-3 font-medium">Userinfo</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className={loading ? "divide-y divide-border/40 opacity-55" : "divide-y divide-border/40"}>
            {connections?.entries.map((connection) => {
              const banned = bannedIps.has(ipKey(connection.clientIp));
              const changing = changingBanIp !== undefined && ipKey(changingBanIp) === ipKey(connection.clientIp);
              return (
                <tr key={connection.id} className={banned ? "align-top bg-primary/5" : "align-top hover:bg-card/45"}>
                  <td className="px-4 py-4 font-semibold"><Q3ColoredText text={connection.playerName} /></td>
                  <td className="px-4 py-4 font-mono text-xs tabular-nums">{connection.clientIp}</td>
                  <td className="px-4 py-4">
                    <span className="font-medium">{connection.serverHost}:{connection.serverPort}</span>
                    {connection.sourceIp && <span className="mt-1 block text-xs text-muted-foreground">Reporter {connection.sourceIp}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{formatTimestamp(connection.receivedAt)}</td>
                  <td className="px-4 py-4"><Userinfo connection={connection} /></td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={banned ? "outline" : "destructive"}
                      disabled={changingBanIp !== undefined}
                      title={banned ? "Remove this IP ban" : "Ban this IP address"}
                      onClick={() => void (banned ? unbanConnection(connection) : banConnection(connection))}
                    >
                      {banned ? <ShieldCheck /> : <Prohibit />} {changing ? banned ? "Unbanning..." : "Banning..." : banned ? "Unban" : "Ban"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && connections && connections.entries.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold">No player connections found.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try clearing the search or wait for a player to connect.</p>
          </div>
        )}
        {loading && !connections && <div className="px-6 py-14 text-center text-sm text-muted-foreground">Loading player connections...</div>}
      </div>

      {connections && (
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Page {connections.page} of {connections.totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!connections.hasPreviousPage || loading} onClick={() => setPage(connections.page - 1)}>
              <CaretLeft /> Previous
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!connections.hasNextPage || loading} onClick={() => setPage(connections.page + 1)}>
              Next <CaretRight />
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
