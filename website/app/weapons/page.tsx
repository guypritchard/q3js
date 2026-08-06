import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { weapons } from "@/lib/weapons";

export const metadata: Metadata = buildPageMetadata({
  title: "Quake III Arena Weapons",
  description: "Explore every Quake III Arena weapon with original 3D models, exact damage and fire-rate stats, player usage, techniques, and counters.",
  path: "/weapons",
  keywords: ["Quake 3 weapons", "Quake III weapon stats", "Railgun", "Rocket Launcher", "Q3JS weapon guide"],
});

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Quake III Arena weapons",
  url: absoluteUrl("/weapons"),
  numberOfItems: weapons.length,
  itemListElement: weapons.map((weapon, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: weapon.name,
    url: absoluteUrl(`/weapons/${weapon.slug}`),
  })),
};

export default function WeaponsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={structuredData} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 md:pt-14">
        <header className="border-b border-border/70 pb-9">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Q3JS // Arsenal database</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black uppercase leading-tight tracking-[0.03em] md:text-5xl">
            Quake III Arena weapons
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            Nine weapons. Nine different answers to the same problem. Inspect the original models, compare engine-accurate stats, learn the techniques, and see which players use each one best on Q3JS.
          </p>
        </header>

        <section aria-labelledby="weapon-list-heading" className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="weapon-list-heading" className="text-xs font-bold uppercase tracking-[0.16em]">Select weapon</h2>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Base arena loadout // 01—09</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {weapons.map((weapon) => (
              <Link
                key={weapon.slug}
                href={`/weapons/${weapon.slug}`}
                className="arena-card group flex min-h-56 flex-col border border-border/70 bg-card hover:border-[var(--weapon-accent)]"
                style={{ "--weapon-accent": weapon.accent } as React.CSSProperties}
              >
                <div className="flex items-center justify-between border-b border-border/70 px-5 py-3 text-[10px] uppercase tracking-[0.14em]">
                  <span className="flex items-center gap-2 font-bold text-[var(--weapon-accent)]">
                    <span className="size-1.5 bg-[var(--weapon-accent)]" aria-hidden="true" />
                    {String(weapon.number).padStart(2, "0")}
                  </span>
                  <span className="text-muted-foreground">{weapon.range} range</span>
                </div>

                <div className="flex flex-1 flex-col px-5 py-5">
                  <h3 className="text-xl font-black uppercase tracking-[0.04em] transition-colors group-hover:text-[var(--weapon-accent)]">{weapon.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{weapon.intro}</p>

                  <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-4 border-t border-border/70 pt-4">
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Damage</span>
                      <span className="mt-1 block text-[10px] font-bold uppercase leading-4 tracking-[0.04em]">{weapon.damage}</span>
                    </div>
                    <ArrowRight className="mb-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-[var(--weapon-accent)]" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
