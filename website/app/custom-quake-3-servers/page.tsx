import type { Metadata } from "next";
import { FeaturePage } from "@/components/feature-page";
import { buildFeatureStructuredData } from "@/lib/feature-seo";
import { buildPageMetadata } from "@/lib/seo";

const path = "/custom-quake-3-servers";
const title = "Custom Quake 3 Servers for Browser Players";
const description =
  "Run and discover custom Quake 3 servers with Q3JS. Configure maps, modes, limits, and mods, then list your Docker-based server for browser players.";

const faq = [
  {
    question: "Can I run my own Q3JS server?",
    answer: "Yes. Q3JS provides a Docker image that packages the dedicated Quake III server and the WebSocket gateway required by browser players.",
  },
  {
    question: "Can a community server appear in the Q3JS server browser?",
    answer: "Yes. A publicly reachable server can send an anonymous heartbeat to the Q3JS master and be listed as a community server without a private project credential.",
  },
  {
    question: "What can a custom server operator configure?",
    answer: "Operators can configure the server name, map, game type, player capacity, frag limit, time limit, networking, and compatible game or mod data.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  keywords: [
    "custom Quake 3 servers",
    "Quake 3 community servers",
    "host Quake 3 server",
    "Quake 3 dedicated server Docker",
    "Quake 3 browser server",
    "Q3JS custom server",
    "run Quake 3 server",
  ],
});

const structuredData = buildFeatureStructuredData({
  breadcrumb: "Custom servers",
  description,
  faq,
  path,
  title,
});

function ServerPreview() {
  return (
    <div className="min-h-72 bg-card p-5 sm:p-6" aria-label="Preview of a custom community server in the Q3JS server browser">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Community server</p>
          <p className="mt-1 font-mono text-base font-black uppercase">My custom arena</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">arena.example.com:27961</p>
        </div>
        <span className="bg-primary px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-primary-foreground">Join</span>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-1">
        {[["Map", "Q3DM17"], ["Mode", "FFA"], ["Limit", "20 frags"]].map(([label, value]) => (
          <div key={label} className="bg-background/55 p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="mt-1 truncate font-mono text-xs font-bold uppercase">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="font-mono text-sm font-bold">6/16</span>
        <div className="h-1.5 flex-1 bg-background"><div className="h-full w-[37.5%] bg-primary" /></div>
        <span className="font-mono text-xs text-muted-foreground">42 ms</span>
      </div>

      <div className="mt-6 grid gap-2">
        {["Ranger", "Sarge", "Xaero"].map((player, index) => (
          <div key={player} className="grid grid-cols-[1fr_auto_auto] gap-4 bg-background/45 px-3 py-2 font-mono text-[10px]">
            <span className="font-bold uppercase">{player}</span>
            <span className="text-muted-foreground">{18 - index * 4} score</span>
            <span className="text-muted-foreground">{38 + index * 9} ping</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomServersFeaturePage() {
  return (
    <FeaturePage
      breadcrumb="Custom servers"
      eyebrow="Your rules, browser players"
      title={title}
      intro="Q3JS is not limited to project-managed arenas. Community operators can run a dedicated server, choose its maps and rules, add the browser gateway, and publish it to the live server list."
      primaryAction={{ href: "/guide", label: "Run a server" }}
      secondaryAction={{ href: "/#servers", label: "Browse servers" }}
      visual={<ServerPreview />}
      facts={[
        { label: "Deployment", value: "Docker" },
        { label: "Browser link", value: "WebSocket" },
        { label: "Listing", value: "Community" },
      ]}
      cardsTitle="A real dedicated server, web-ready"
      cardsIntro="The Q3JS server package keeps native Quake III behavior and adds the pieces required for discovery and browser connections."
      cards={[
        {
          eyebrow: "Game rules",
          title: "Choose the arena",
          description: "Set the hostname, map, game type, player capacity, frag limit, time limit, and the rest of the familiar server configuration.",
        },
        {
          eyebrow: "Browser access",
          title: "WebSocket gateway",
          description: "The packaged gateway makes the UDP-based game server reachable to a browser through ws:// or a correctly configured wss:// endpoint.",
        },
        {
          eyebrow: "Discovery",
          title: "Community listing",
          description: "Public servers can register with the Q3JS master. Reachable arenas appear with live maps, modes, player counts, and ping.",
        },
        {
          eyebrow: "Variants",
          title: "Compatible mods",
          description: "The runtime supports separate game directories and mods; browser clients also need access to the matching published PK3 assets.",
        },
      ]}
      stepsTitle="From Docker to the list"
      stepsIntro="The full guide includes copyable commands, network requirements, health checks, and troubleshooting."
      steps={[
        { title: "Provide legal game data", description: "Mount the required baseq3 PK3 files into the versioned Q3JS server container without publishing them in the image." },
        { title: "Publish both protocols", description: "Expose UDP 27960 for the game server and TCP 27961 for the browser-facing WebSocket gateway." },
        { title: "Register and verify", description: "Send heartbeats to the Q3JS master, confirm the public endpoint is reachable, and find the server in the browser." },
      ]}
      faq={faq}
      ctaTitle="Build your own arena"
      ctaDescription="Follow the operator guide from local health check to a persistent public server listed for Q3JS players."
      ctaLink={{ href: "/guide", label: "Open server guide" }}
      relatedLinks={[
        { href: "/guide", label: "Complete setup guide" },
        { href: "/quake-3-browser-mods", label: "Browser mod support" },
        { href: "/#servers", label: "Community servers" },
      ]}
      structuredData={structuredData}
    />
  );
}
