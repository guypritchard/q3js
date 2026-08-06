import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { ProfilePage } from "@/components/profile-page";
import { SiteHeader } from "@/components/site-header";
import { fetchProfile, fetchProfileDistribution } from "@/lib/profile-server";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type RouteParameters = { name: string };
type SearchParameters = Record<string, string | string[] | undefined>;

function parameter(parameters: SearchParameters, name: string): string | undefined {
  const value = parameters[name];
  return Array.isArray(value) ? value[0] : value;
}

function distributionPeriod(value?: string): string {
  const normalized = value?.trim().toLowerCase().replaceAll("_", "-");
  return ["daily", "weekly", "monthly", "all-time"].includes(normalized ?? "")
    ? normalized!
    : "daily";
}

function distributionTimeZone(value?: string): string {
  const timeZone = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "UTC";
  }
}

function decodePlayerName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function routeProfile(params: Promise<RouteParameters>) {
  const parameters = await params;
  const playerName = decodePlayerName(parameters.name);
  return {
    playerName,
    profile: await fetchProfile(playerName),
  };
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<RouteParameters> }>): Promise<Metadata> {
  const { playerName, profile } = await routeProfile(params);
  const path = `/players/${encodeURIComponent(playerName)}`;
  if (!profile) {
    return buildPageMetadata({
      title: "Player not found",
      description: "This Q3JS player profile could not be found.",
      path,
      robots: { index: false, follow: false },
    });
  }
  const plainName = playerName.replace(/\^(?:[0-9]|x[0-9a-f]{6})/gi, "");
  const displayName = plainName || playerName;
  return buildPageMetadata({
    title: `${displayName} Player Profile`,
    description: `Kills, deaths, playtime, weapons, maps, and rivals for ${plainName || playerName} on Q3JS.`,
    path,
    keywords: [displayName, `${displayName} Q3JS`, "Q3JS player", "Quake 3 stats", "Quake III Arena player"],
  });
}

export default async function PlayerProfileRoute({
  params,
  searchParams,
}: Readonly<{
  params: Promise<RouteParameters>;
  searchParams: Promise<SearchParameters>;
}>) {
  const [{ playerName, profile }, parameters] = await Promise.all([
    routeProfile(params),
    searchParams,
  ]);
  if (!profile) notFound();
  const period = distributionPeriod(parameter(parameters, "period"));
  const timeZone = distributionTimeZone(parameter(parameters, "timeZone"));
  const distribution = await fetchProfileDistribution(playerName, period, timeZone);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <ProfilePage
        distribution={distribution}
        period={period}
        profile={profile}
        timeZone={timeZone}
      />
      <Footer />
    </div>
  );
}
