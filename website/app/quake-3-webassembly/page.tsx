import type { Metadata } from "next";
import { FeaturePage } from "@/components/feature-page";
import { buildFeatureStructuredData } from "@/lib/feature-seo";
import { buildPageMetadata } from "@/lib/seo";

const path = "/quake-3-webassembly";
const title = "Quake 3 Powered by WebAssembly";
const description =
  "See how Q3JS runs ioquake3 in a web browser with WebAssembly, the OpenGL 2 renderer, persistent browser storage, and a WebSocket-to-UDP game gateway.";

const faq = [
  {
    question: "Is Q3JS a recreation of Quake 3?",
    answer: "No. Q3JS compiles the ioquake3 engine for the web with Emscripten and WebAssembly, then connects it to browser-specific storage, input, and networking.",
  },
  {
    question: "How does a browser connect to a Quake 3 server?",
    answer: "The browser client uses a WebSocket connection. A Q3JS gateway translates that traffic for the UDP-based dedicated game server.",
  },
  {
    question: "Does Q3JS include proprietary Quake 3 game data?",
    answer: "No. Q3JS does not include or download proprietary Quake III Arena data. Operators must provide game data they are legally entitled to use.",
  },
] as const;

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path,
  keywords: [
    "Quake 3 WebAssembly",
    "Quake 3 WASM",
    "ioquake3 browser",
    "ioquake3 WebAssembly",
    "Quake III Arena browser engine",
    "WebAssembly FPS",
    "Q3JS architecture",
  ],
});

const structuredData = buildFeatureStructuredData({
  breadcrumb: "WebAssembly engine",
  description,
  faq,
  path,
  title,
});

function ArchitecturePreview() {
  return (
    <div className="min-h-72 bg-card p-5 sm:p-6" aria-label="Q3JS browser game architecture diagram">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Live runtime path</p>
      <div className="mt-6 grid gap-2">
        {[
          ["01", "Web browser", "Input · canvas · IndexedDB"],
          ["02", "ioquake3 / WASM", "Game engine · OpenGL 2"],
          ["03", "WebSocket gateway", "Browser traffic → UDP"],
          ["04", "Dedicated server", "Maps · players · game state"],
        ].map(([number, label, detail], index) => (
          <div key={number}>
            <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 bg-background/55 p-3">
              <span className="font-mono text-[10px] font-bold text-primary">{number}</span>
              <div>
                <p className="font-mono text-xs font-bold uppercase">{label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
              </div>
            </div>
            {index < 3 && <div className="ml-[1.9rem] h-2 w-px bg-primary/50" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WebAssemblyFeaturePage() {
  return (
    <FeaturePage
      breadcrumb="WebAssembly engine"
      eyebrow="Native arena, web delivery"
      title={title}
      intro="Q3JS brings the ioquake3 runtime to the browser instead of imitating it. WebAssembly executes the engine, the canvas renders the arena, and a gateway connects web networking to a dedicated server."
      primaryAction={{ href: "/#servers", label: "Play in browser" }}
      secondaryAction={{ href: "https://github.com/lklacar/q3js", label: "View source" }}
      visual={<ArchitecturePreview />}
      facts={[
        { label: "Engine", value: "ioquake3" },
        { label: "Runtime", value: "WebAssembly" },
        { label: "Renderer", value: "OpenGL 2" },
      ]}
      cardsTitle="A complete browser runtime"
      cardsIntro="Running the engine is only one part of the job. Q3JS also adapts files, graphics, networking, and input for the web."
      cards={[
        {
          eyebrow: "Engine",
          title: "Compiled with Emscripten",
          description: "The ioquake3 codebase is built as JavaScript and WebAssembly so modern browsers can execute the game runtime.",
        },
        {
          eyebrow: "Rendering",
          title: "OpenGL 2 on canvas",
          description: "The engine's OpenGL 2 renderer draws through the browser canvas while preserving the familiar Quake III presentation.",
        },
        {
          eyebrow: "Networking",
          title: "WebSockets meet UDP",
          description: "Browser-safe WebSocket traffic passes through a gateway to the UDP protocol used by the dedicated server.",
        },
        {
          eyebrow: "Storage",
          title: "Persistent local files",
          description: "Compatible browsers keep game assets and runtime state in IndexedDB, avoiding unnecessary repeat downloads.",
        },
      ]}
      stepsTitle="What happens when you join"
      stepsIntro="The website hands the selected server and its assets to a framework-independent browser client."
      steps={[
        { title: "Prepare the files", description: "Q3JS reads the server's asset manifests and restores matching files from persistent browser storage." },
        { title: "Start the engine", description: "The WebAssembly runtime mounts its virtual filesystem, configures the renderer, and launches ioquake3." },
        { title: "Connect to the arena", description: "The client opens a WebSocket to the server gateway, which bridges the browser session to the game server." },
      ]}
      faq={faq}
      ctaTitle="See it running"
      ctaDescription="Choose a live server and launch the WebAssembly client directly in your browser."
      ctaLink={{ href: "/#servers", label: "Play Q3JS" }}
      relatedLinks={[
        { href: "/#servers", label: "Live servers" },
        { href: "/quake-3-browser-mods", label: "Browser mods" },
        { href: "https://github.com/lklacar/q3js", label: "Source code" },
      ]}
      structuredData={structuredData}
    />
  );
}
