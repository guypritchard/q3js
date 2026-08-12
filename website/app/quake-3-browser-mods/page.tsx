import type { Metadata } from "next";
import { FeaturePage } from "@/components/feature-page";
import { buildFeatureStructuredData } from "@/lib/feature-seo";
import { buildPageMetadata } from "@/lib/seo";

const path = "/quake-3-browser-mods";
const title = "Quake 3 Mods in Your Browser";
const description =
  "Learn how Q3JS supports compatible Quake 3 browser mods with server-selected game directories, safe PK3 manifests, automatic asset loading, and persistent caching.";

const faq = [
  {
    question: "Can Q3JS load Quake 3 mods?",
    answer: "Yes. Q3JS supports compatible PK3-based game and mod directories advertised by a server, including separate base-game and mod asset manifests.",
  },
  {
    question: "Do I need to install a mod manually?",
    answer: "No desktop installation is required. When a listed server advertises a supported mod, the browser client requests the matching published assets before starting the game.",
  },
  {
    question: "Are mod files downloaded every match?",
    answer: "Usually not. Compatible browsers store downloaded assets in IndexedDB and reuse files whose size still matches the published version.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  keywords: [
    "Quake 3 browser mods",
    "Quake 3 mods online",
    "Quake III Arena mods browser",
    "Q3JS mods",
    "CPMA browser",
    "OSP browser",
    "Quake 3 PK3 mods",
  ],
});

const structuredData = buildFeatureStructuredData({
  breadcrumb: "Browser mods",
  description,
  faq,
  path,
  title,
});

function ModsPreview() {
  return (
    <div className="min-h-72 bg-card p-5 sm:p-6" aria-label="Diagram of Quake 3 base and mod assets loaded by Q3JS">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Selected server</p>
          <p className="mt-1 font-mono text-sm font-bold uppercase">Competitive arena</p>
        </div>
        <span className="bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-primary">fs_game</span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="bg-background/55 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Base layer</p>
          <p className="mt-2 font-mono text-base font-black uppercase">baseq3</p>
          <div className="mt-4 grid gap-1.5">
            {["pak0.pk3", "pak1.pk3", "pak8.pk3"].map((file) => (
              <span key={file} className="bg-card px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">{file}</span>
            ))}
          </div>
        </div>
        <div className="bg-primary/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">Mod layer</p>
          <p className="mt-2 font-mono text-base font-black uppercase">server mod</p>
          <div className="mt-4 grid gap-1.5">
            {["manifest.json", "mod-assets.pk3", "game-vm.pk3"].map((file) => (
              <span key={file} className="bg-background/55 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">{file}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Restore cache → fetch changes → launch mod
      </p>
    </div>
  );
}

export default function BrowserModsFeaturePage() {
  return (
    <FeaturePage
      breadcrumb="Browser mods"
      eyebrow="More than baseq3"
      title={title}
      intro="A browser match can use more than the base game. Q3JS reads the game directory advertised by a compatible server, loads its published PK3 assets, and starts ioquake3 with that mod selected."
      primaryAction={{ href: "/#servers", label: "Browse servers" }}
      secondaryAction={{ href: "/custom-quake-3-servers", label: "Custom servers" }}
      visual={<ModsPreview />}
      facts={[
        { label: "Format", value: "PK3 assets" },
        { label: "Selection", value: "Server driven" },
        { label: "Storage", value: "Browser cached" },
      ]}
      cardsTitle="Mods without a desktop installer"
      cardsIntro="The server, static asset service, and browser client agree on one game directory and one safe list of files."
      cards={[
        {
          eyebrow: "Discovery",
          title: "Server-selected game",
          description: "Q3JS reads the advertised base game and fs_game values so the browser starts with the same game directory as the server.",
        },
        {
          eyebrow: "Delivery",
          title: "Manifest-based assets",
          description: "Each game directory publishes a generated manifest containing safe PK3 filenames rather than exposing arbitrary files.",
        },
        {
          eyebrow: "Loading",
          title: "Base plus mod",
          description: "The client can combine base-game assets with a separate mod directory before launching the WebAssembly engine.",
        },
        {
          eyebrow: "Return matches",
          title: "Persistent cache",
          description: "Downloaded packages are stored in the browser and reused when they still match the files advertised by the asset server.",
        },
      ]}
      stepsTitle="How a modded match starts"
      stepsIntro="There is no separate mod picker. The server selection provides the configuration."
      steps={[
        { title: "Choose a compatible server", description: "Select a listed server whose game information includes a supported base game or mod directory." },
        { title: "Load the manifests", description: "Q3JS requests the base-game manifest and, when needed, the additional manifest for the advertised mod." },
        { title: "Launch with fs_game", description: "After restoring cached files and downloading changes, the client starts ioquake3 with the server's mod selected." },
      ]}
      faq={faq}
      ctaTitle="Find a different arena"
      ctaDescription="Browse the live list to see the maps, modes, and game variants currently offered by Q3JS servers."
      ctaLink={{ href: "/#servers", label: "View servers" }}
      relatedLinks={[
        { href: "/#servers", label: "Server browser" },
        { href: "/quake-3-webassembly", label: "WebAssembly engine" },
        { href: "/guide", label: "Server setup guide" },
      ]}
      structuredData={structuredData}
    />
  );
}
