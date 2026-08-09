"use client";

import { type FormEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
import { banPlayer, getPlayerAddresses, loginAdmin, unbanPlayer } from "@/lib/api/generated/sdk.gen";
import type { PlayerAddressPageResponse, PlayerAddressResponse } from "@/lib/api/generated/types.gen";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function Userinfo({ address }: Readonly<{ address: PlayerAddressResponse }>) {
  const entries = Object.entries(address.userinfo).sort(([first], [second]) => first.localeCompare(second));
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

function KnownNames({ address }: Readonly<{ address: PlayerAddressResponse }>) {
  if (address.names.length === 0) {
    return <span className="text-xs text-muted-foreground">No recorded names</span>;
  }
  return (
    <ul className="min-w-48 space-y-2">
      {address.names.map((name, index) => (
        <li key={name.playerName} className="flex items-baseline justify-between gap-4">
          <span className={index === 0 ? "font-semibold" : "text-muted-foreground"}>
            <Q3ColoredText text={name.playerName} />
          </span>
          <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
            {name.connectionCount}×
          </span>
        </li>
      ))}
    </ul>
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
          Authenticate with the master administrator password to inspect player addresses and manage IP bans.
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
  const [addresses, setAddresses] = useState<PlayerAddressPageResponse>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [changingBanIp, setChangingBanIp] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const logout = useCallback(() => {
    clearAdminToken();
    setAddresses(undefined);
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
        const result = await getPlayerAddresses({
          client,
          query: { page, pageSize: 50, search: search || undefined },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          throwOnError: false,
        });
        if (controller.signal.aborted) return;
        if (!result.data) {
          const status = result.response?.status;
          if (status === 401 || status === 403) {
            logout();
          } else {
            setError("Could not load player addresses.");
          }
          return;
        }
        setAddresses(result.data);
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

  const banAddress = async (address: PlayerAddressResponse) => {
    const knownNames = address.names.map((name) => name.playerName).join(", ") || "none";
    const confirmed = window.confirm(
      `Ban ${address.ipAddress}?\n\nKnown names: ${knownNames}\n\nNew WebSocket connections from this IP will be rejected after gateways refresh their ban lists.`,
    );
    if (!confirmed) return;

    setChangingBanIp(address.ipAddress);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await banPlayer({
        client,
        body: { ipAddress: address.ipAddress },
        headers: { Authorization: `Bearer ${token}` },
        throwOnError: false,
      });
      if (!result.data) {
        if (result.response?.status === 401 || result.response?.status === 403) {
          logout();
        } else {
          setError(`Could not ban ${address.ipAddress}.`);
        }
        return;
      }
      setAddresses((current) => current && ({
        ...current,
        entries: current.entries.map((entry) => entry.ipAddress === address.ipAddress
          ? { ...entry, bannedAt: result.data.bannedAt }
          : entry),
      }));
      setNotice(`${address.ipAddress} is now banned.`);
    } catch {
      setError("The master server could not be reached.");
    } finally {
      setChangingBanIp(undefined);
    }
  };

  const unbanAddress = async (address: PlayerAddressResponse) => {
    const confirmed = window.confirm(
      `Unban ${address.ipAddress}?\n\nGateways will allow new WebSocket connections from this IP after their next ban-list refresh.`,
    );
    if (!confirmed) return;

    setChangingBanIp(address.ipAddress);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await unbanPlayer({
        client,
        path: { ipAddress: address.ipAddress },
        headers: { Authorization: `Bearer ${token}` },
        throwOnError: false,
      });
      if (result.response?.status !== 204) {
        if (result.response?.status === 401 || result.response?.status === 403) {
          logout();
        } else {
          setError(`Could not unban ${address.ipAddress}.`);
        }
        return;
      }
      setAddresses((current) => current && ({
        ...current,
        entries: current.entries.map((entry) => entry.ipAddress === address.ipAddress
          ? { ...entry, bannedAt: undefined }
          : entry),
      }));
      setNotice(`${address.ipAddress} is no longer banned.`);
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
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Master administration / Address registry</p>
          <h1 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.035em] md:text-4xl">Player addresses</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            One record per IP address, with every observed player name and the latest sanitized connection details.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
            <ArrowClockwise className={loading ? "animate-spin" : undefined} /> Refresh
          </Button>
          <Button type="button" variant="ghost" onClick={logout}><SignOut /> Logout</Button>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Address summary">
        <div className="border border-border/60 bg-card/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Matching addresses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{addresses?.totalEntries ?? "—"}</p>
        </div>
        <div className="border border-border/60 bg-card/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Page</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{addresses ? `${addresses.page} / ${addresses.totalPages}` : "—"}</p>
        </div>
        <div className="border border-border/60 bg-card/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Banned on this page</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
            {addresses ? addresses.entries.filter((address) => address.bannedAt).length : "—"}
          </p>
        </div>
      </section>

      <form onSubmit={submitSearch} className="mt-4 flex flex-col gap-2 border border-border/60 bg-card/35 p-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search IP addresses, known names, or servers</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={128}
            placeholder="Search IP address, known name, or latest server"
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
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-card/75 text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">IP address</th>
              <th className="px-4 py-3 font-medium">Known names</th>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Latest server</th>
              <th className="px-4 py-3 font-medium">Latest userinfo</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className={loading ? "divide-y divide-border/40 opacity-55" : "divide-y divide-border/40"}>
            {addresses?.entries.map((address) => {
              const banned = Boolean(address.bannedAt);
              const changing = changingBanIp === address.ipAddress;
              return (
                <tr key={address.ipAddress} className={banned ? "align-top bg-primary/5" : "align-top hover:bg-card/45"}>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs font-semibold tabular-nums">{address.ipAddress}</span>
                    {banned && (
                      <span className="mt-2 block w-fit border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                        Banned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4"><KnownNames address={address} /></td>
                  <td className="px-4 py-4">
                    <span className="font-semibold tabular-nums">{address.connectionCount} connection{address.connectionCount === 1 ? "" : "s"}</span>
                    <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                      Last {address.lastSeenAt ? formatTimestamp(address.lastSeenAt) : "never seen"}
                    </span>
                    {address.firstSeenAt && <span className="mt-1 block whitespace-nowrap text-[11px] text-muted-foreground">First {formatTimestamp(address.firstSeenAt)}</span>}
                  </td>
                  <td className="px-4 py-4">
                    {address.serverHost && address.serverPort
                      ? <span className="font-medium">{address.serverHost}:{address.serverPort}</span>
                      : <span className="text-xs text-muted-foreground">No connection recorded</span>}
                    {address.sourceIp && <span className="mt-1 block text-xs text-muted-foreground">Reporter {address.sourceIp}</span>}
                  </td>
                  <td className="px-4 py-4"><Userinfo address={address} /></td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={banned ? "outline" : "destructive"}
                      disabled={changingBanIp !== undefined}
                      title={banned ? "Remove this IP ban" : "Ban this IP address"}
                      onClick={() => void (banned ? unbanAddress(address) : banAddress(address))}
                    >
                      {banned ? <ShieldCheck /> : <Prohibit />} {changing ? banned ? "Unbanning..." : "Banning..." : banned ? "Unban" : "Ban"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && addresses && addresses.entries.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold">No player addresses found.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try clearing the search or wait for a player to connect.</p>
          </div>
        )}
        {loading && !addresses && <div className="px-6 py-14 text-center text-sm text-muted-foreground">Loading player addresses...</div>}
      </div>

      {addresses && (
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Page {addresses.page} of {addresses.totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!addresses.hasPreviousPage || loading} onClick={() => setPage(addresses.page - 1)}>
              <CaretLeft /> Previous
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!addresses.hasNextPage || loading} onClick={() => setPage(addresses.page + 1)}>
              Next <CaretRight />
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
