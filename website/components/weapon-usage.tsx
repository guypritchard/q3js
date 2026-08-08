"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Crosshair, Skull, Users } from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeaponUsageOptions } from "@/lib/api/generated/@tanstack/react-query.gen";
import { client } from "@/lib/api/client";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function WeaponUsageContent({ slug }: Readonly<{ slug: string }>) {
  const { data } = useSuspenseQuery({
    ...getWeaponUsageOptions({ client, path: { slug } }),
    staleTime: 30_000,
  });
  return (
    <div className="border border-border/70 bg-card">
      <dl className="grid sm:grid-cols-3">
        <div className="border-b border-border/70 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Skull className="size-4 text-primary" /> Recorded kills
          </dt>
          <dd className="mt-3 text-3xl font-bold tabular-nums">{formatNumber(data.kills)}</dd>
        </div>
        <div className="border-b border-border/70 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Users className="size-4 text-primary" /> Fraggers
          </dt>
          <dd className="mt-3 text-3xl font-bold tabular-nums">{formatNumber(data.uniquePlayers)}</dd>
        </div>
        <div className="p-4 sm:p-5">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Crosshair className="size-4 text-primary" /> Share of weapon kills
          </dt>
          <dd className="mt-3 flex items-end gap-3">
            <span className="text-3xl font-bold tabular-nums">{data.killShare.toFixed(2)}%</span>
            <span className="pb-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">All time</span>
          </dd>
          <div className="mt-4 h-1 bg-muted" aria-hidden="true">
            <div className="h-full bg-primary" style={{ width: `${Math.min(data.killShare, 100)}%` }} />
          </div>
        </div>
      </dl>

      <div className="border-t border-border/70">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em]">Top operators</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Q3JS lifetime</span>
        </div>
        {data.leaders.length ? (
          <ol>
            {data.leaders.map((leader, index) => (
              <li key={leader.playerName} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/50 px-4 py-3 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-5">
                <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <Link href={`/players/${encodeURIComponent(leader.playerName)}`} className="min-w-0 truncate font-bold hover:text-primary">
                  <Q3ColoredText text={leader.playerName} />
                </Link>
                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:text-sm">{formatNumber(leader.kills)} kills</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-5 py-8 text-sm text-muted-foreground">No kills recorded with this weapon yet. Be the first.</p>
        )}
      </div>
    </div>
  );
}

function WeaponUsagePending() {
  return (
    <div className="border border-border/70 bg-card" aria-busy="true" aria-label="Loading weapon usage">
      <div className="grid sm:grid-cols-3">
        {["Kills", "Fraggers", "Share"].map((label, index) => (
          <div key={label} className={`p-5 ${index < 2 ? "border-b border-border/70 sm:border-b-0 sm:border-r" : ""}`}>
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
            <Skeleton className="mt-4 h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="border-t border-border/70 p-5">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Top operators</span>
        {[1, 2, 3].map((row) => <Skeleton key={row} className="mt-4 h-5 w-full" />)}
      </div>
    </div>
  );
}

export function WeaponUsage({ slug }: Readonly<{ slug: string }>) {
  return (
    <QueryBoundary
      pendingFallback={<WeaponUsagePending />}
      errorFallback={() => (
        <div className="border border-border/70 bg-card px-5 py-6 text-sm text-muted-foreground">
          Live weapon usage is temporarily unavailable. The mechanics and strategy guide are still ready below.
        </div>
      )}
    >
      <WeaponUsageContent slug={slug} />
    </QueryBoundary>
  );
}
