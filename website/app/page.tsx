import Link from "next/link";
import { Coffee } from "@phosphor-icons/react/dist/ssr";
import { CounterStrikeDialog } from "@/components/counter-strike-dialog";
import { Footer } from "@/components/footer";
import { HomeStats } from "@/components/home-stats";
import { JsonLd } from "@/components/json-ld";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { ScoreboardPreview } from "@/components/scoreboard-preview";
import { ServerBrowser } from "@/components/server-browser";
import { SiteHeader } from "@/components/site-header";
import { csjsPromotionUrl } from "@/lib/cross-promotion";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

const homeMetadata = buildPageMetadata({
  title: siteConfig.defaultTitle,
  description: siteConfig.description,
  path: "/",
});

export const metadata = {
  ...homeMetadata,
  // A title template only applies to child route segments, while the home page
  // shares the root layout segment. Keep the brand suffix explicit here.
  title: { absolute: `${siteConfig.defaultTitle} | ${siteConfig.name}` },
};

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    potentialAction: {
      "@type": "ViewAction",
      name: "Browse live Quake III Arena servers",
      target: absoluteUrl("/#servers"),
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    genre: "First-person shooter",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.url,
      sameAs: [siteConfig.author.url, siteConfig.author.xUrl],
    },
    image: absoluteUrl("/opengraph-image"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
] satisfies ReadonlyArray<Record<string, unknown>>;

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={homeStructuredData} />
      <SiteHeader />
      <CounterStrikeDialog />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-7 sm:pb-20 sm:pt-10 md:pt-14">
        <section aria-labelledby="hero-heading" className="mb-10 py-5 text-center sm:mb-14 sm:py-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
            Quake 3 in browser
          </p>
          <h1
            id="hero-heading"
            className="mx-auto mt-3 max-w-4xl font-mono text-[1.75rem] font-bold uppercase leading-[1.15] tracking-[0.025em] sm:text-3xl sm:tracking-[0.035em] md:text-4xl"
          >
            Pick an arena. Play Quake III.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Choose a live server, enter a player name, and play in your browser. No installer or account required.
          </p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-2 min-[380px]:grid-cols-2 sm:gap-3">
            <Link
              href="/#servers"
              className="inline-flex h-10 items-center justify-center bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-primary-foreground hover:bg-primary/80"
            >
              Browse live servers
            </Link>
            <Link
              href="/host"
              className="inline-flex h-10 items-center justify-center bg-secondary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-secondary-foreground hover:bg-secondary/80"
            >
              Host a game
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            First visit downloads the game data once. Later launches reuse the browser cache.
          </p>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Created by{" "}
            <a
              href={siteConfig.author.xUrl}
              target="_blank"
              rel="author noreferrer"
              className="font-bold hover:text-foreground"
            >
              <Q3ColoredText text={siteConfig.author.coloredName} />
            </a>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Link href="/scoreboard" className="underline decoration-border underline-offset-4 hover:text-primary">View scoreboard</Link>
            <a href={siteConfig.supportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline decoration-border underline-offset-4 hover:text-primary">
              <Coffee className="size-3.5" weight="fill" aria-hidden="true" /> Support Q3JS
            </a>
            <a href={csjsPromotionUrl("homepage_hero")} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 hover:text-primary">Play Counter-Strike ↗</a>
            <a href="https://jk.q3js.com" target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 hover:text-primary">Play Jedi Academy ↗</a>
          </div>
        </section>
        <ServerBrowser />
        <section aria-labelledby="how-it-works-heading" className="my-10 border-y border-border/60 py-8">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">New here?</p>
          <h2 id="how-it-works-heading" className="mt-2 font-mono text-2xl font-bold uppercase tracking-[0.035em]">Playing takes three steps</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Choose an arena", "Use Quick play or compare the human player and latency counts."],
              ["02", "Name your player", "Your name is remembered locally. Voice chat remains optional."],
              ["03", "Enter the game", "Use WASD and mouse. Press Esc for the Quake III menu."],
            ].map(([step, title, description]) => (
              <li key={step} className="border border-border/60 bg-card/45 p-4">
                <span className="font-mono text-xs font-bold text-primary">{step}</span>
                <h3 className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.05em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </section>
        <HomeStats />
        <ScoreboardPreview />
      </main>

      <Footer />
    </div>
  );
}
