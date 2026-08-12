import type { Metadata } from "next";
import { Crosshair, Trophy } from "@phosphor-icons/react/dist/ssr";
import { FeaturePage } from "@/components/feature-page";
import { buildFeatureStructuredData } from "@/lib/feature-seo";
import { buildPageMetadata } from "@/lib/seo";

const path = "/quake-3-player-stats";
const title = "Quake 3 Player Stats and Rankings";
const description =
  "Explore Quake 3 player stats in Q3JS, including global frag rankings, K/D, playtime, weapon kills, favorite maps, rivals, and activity history.";

const faq = [
  {
    question: "Which Quake 3 stats does Q3JS track?",
    answer: "Player profiles can include rank, kills, deaths, K/D ratio, playtime, favorite map, favorite weapon, weapon breakdown, top victims, top nemeses, and frag activity over time.",
  },
  {
    question: "Can I view daily and all-time rankings?",
    answer: "Yes. The global scoreboard can be viewed for the last 24 hours, current week, current month, or all recorded time.",
  },
  {
    question: "How do I find my Q3JS profile?",
    answer: "Open the scoreboard, search for the player name used in your matches, and select it to open the full profile.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  keywords: [
    "Quake 3 player stats",
    "Quake 3 rankings",
    "Quake III leaderboard",
    "Quake 3 K/D stats",
    "Quake 3 player profile",
    "Q3JS scoreboard",
    "Quake 3 frag leaderboard",
  ],
});

const structuredData = buildFeatureStructuredData({
  breadcrumb: "Player stats",
  description,
  faq,
  path,
  title,
});

function StatsPreview() {
  return (
    <div className="min-h-72 bg-card p-5 sm:p-6" aria-label="Preview of a Q3JS player statistics profile">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Combat record</p>
          <p className="mt-1 font-mono text-xl font-black uppercase">Ranger</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Global rank</p>
          <p className="font-mono text-2xl font-black text-primary">#12</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-1">
        {[["Kills", "2,418"], ["K/D", "2.18"], ["Playtime", "31h"]].map(([label, value]) => (
          <div key={label} className="bg-background/55 px-3 py-3">
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-sm font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="bg-background/45 p-3">
          <div className="flex items-center gap-2 text-primary"><Crosshair className="size-4" /><span className="font-mono text-[9px] uppercase">Favorite weapon</span></div>
          <p className="mt-2 font-mono text-xs font-bold uppercase">Rocket launcher</p>
        </div>
        <div className="bg-background/45 p-3">
          <div className="flex items-center gap-2 text-primary"><Trophy className="size-4" /><span className="font-mono text-[9px] uppercase">Favorite map</span></div>
          <p className="mt-2 font-mono text-xs font-bold uppercase">Q3DM17</p>
        </div>
      </div>

      <div className="mt-5 flex h-12 items-end gap-1" aria-label="Example frag activity chart">
        {[22, 35, 18, 44, 31, 48, 38, 55, 42, 61, 47, 66].map((height, index) => (
          <span key={index} className="flex-1 bg-primary/70" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function PlayerStatsFeaturePage() {
  return (
    <FeaturePage
      breadcrumb="Player stats"
      eyebrow="Every frag leaves a record"
      title={title}
      intro="Q3JS turns reported matches into searchable rankings and detailed player profiles. See who is leading, how a player fights, and when the arenas are busiest."
      primaryAction={{ href: "/scoreboard", label: "View scoreboard" }}
      secondaryAction={{ href: "/scoreboard/distribution", label: "Frag activity" }}
      visual={<StatsPreview />}
      facts={[
        { label: "Ranking periods", value: "4 views" },
        { label: "Combat detail", value: "Weapon kills" },
        { label: "Matchups", value: "Rivals tracked" },
      ]}
      cardsTitle="More than a frag total"
      cardsIntro="The scoreboard answers who is ahead. A player profile explains the record behind that position."
      cards={[
        {
          eyebrow: "Global scoreboard",
          title: "Rank the arena",
          description: "Compare frag leaders over 24 hours, the current week, the current month, or all recorded time.",
        },
        {
          eyebrow: "Player profile",
          title: "Read the full record",
          description: "See rank, kills, deaths, K/D ratio, total playtime, and the last time a player was online.",
        },
        {
          eyebrow: "Combat preferences",
          title: "Maps and weapons",
          description: "Find a player's favorite map and weapon, then inspect the kill share for every recorded weapon.",
        },
        {
          eyebrow: "Head to head",
          title: "Victims and nemeses",
          description: "Profiles show the opponents a player defeats most often—and the names that return the favor.",
        },
      ]}
      stepsTitle="From match to profile"
      stepsIntro="Statistics are organized around the player name used when joining a Q3JS match."
      steps={[
        { title: "Play under a name", description: "Enter a consistent player name before joining a server that reports match activity to Q3JS." },
        { title: "Open the scoreboard", description: "Search the global rankings and switch between daily, weekly, monthly, and all-time views." },
        { title: "Inspect the profile", description: "Select a player to explore combat totals, activity, weapon use, maps, victims, and nemeses." },
      ]}
      faq={faq}
      ctaTitle="Find a player"
      ctaDescription="Search the global scoreboard, compare frag totals, and open any recorded Q3JS player profile."
      ctaLink={{ href: "/scoreboard", label: "Open scoreboard" }}
      relatedLinks={[
        { href: "/scoreboard", label: "Global rankings" },
        { href: "/weapons", label: "Weapon database" },
        { href: "/#servers", label: "Play a match" },
      ]}
      structuredData={structuredData}
    />
  );
}
