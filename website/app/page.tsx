import Link from "next/link";
import { GameController, HardDrives } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { ServerBrowser } from "@/components/server-browser";
import { SiteHeader } from "@/components/site-header";
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
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:pb-20">
        <section aria-labelledby="hero-heading" className="border-x border-b border-border bg-card px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Quake III in your browser
          </p>
          <h1 id="hero-heading" className="mt-4 max-w-3xl font-mono text-5xl font-black uppercase leading-[0.9] tracking-[-0.07em] sm:text-7xl">
            Pick an arena.
            <span className="block text-primary">Start playing.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            No account. No installer. Choose a live server below and jump straight into Quake III Arena.
          </p>

          <div className="mt-8 grid gap-2 sm:grid-cols-3">
            <Link href="/#servers" className="flex min-h-14 items-center justify-center gap-3 border border-primary bg-primary px-4 py-3 font-mono text-xs font-bold uppercase text-primary-foreground transition-colors hover:bg-primary/85">
              <GameController className="size-5" weight="fill" aria-hidden="true" />
              Play
            </Link>
            <Link href="/host" className="flex min-h-14 items-center justify-center border border-border bg-background px-4 py-3 text-center font-mono text-xs font-bold uppercase transition-colors hover:border-primary hover:text-primary">
              Host a temporary arena
            </Link>
            <Link href="/guide" className="flex min-h-14 items-center justify-center gap-3 border border-border bg-background px-4 py-3 text-center font-mono text-xs font-bold uppercase transition-colors hover:border-primary hover:text-primary">
              <HardDrives className="size-5" aria-hidden="true" />
              Run a server
            </Link>
          </div>
        </section>

        <div className="border-x border-b border-border bg-background px-4 py-10 sm:px-8 sm:py-12 lg:px-12">
          <ServerBrowser />
        </div>
      </main>

      <Footer />
    </div>
  );
}
