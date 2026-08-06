import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldChevron, Target } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { WeaponModelViewer } from "@/components/weapon-model-viewer";
import { WeaponUsage } from "@/components/weapon-usage";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getAdjacentWeapons, getWeapon, weapons } from "@/lib/weapons";

interface WeaponPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return weapons.map((weapon) => ({ slug: weapon.slug }));
}

export async function generateMetadata({ params }: WeaponPageProps): Promise<Metadata> {
  const { slug } = await params;
  const weapon = getWeapon(slug);
  if (!weapon) return {};
  return buildPageMetadata({
    title: `${weapon.name} — Quake III Weapon Guide`,
    description: `${weapon.name} stats, original 3D model, live Q3JS player usage, techniques, counters, damage, fire rate, and strategy for Quake III Arena.`,
    path: `/weapons/${weapon.slug}`,
    keywords: [weapon.name, `${weapon.name} Quake 3`, `${weapon.name} stats`, "Quake III weapon guide", "Q3JS"],
  });
}

export default async function WeaponPage({ params }: WeaponPageProps) {
  const { slug } = await params;
  const weapon = getWeapon(slug);
  if (!weapon) notFound();
  const adjacent = getAdjacentWeapons(slug);
  const stats = [
    ["Damage", weapon.damage],
    ["Fire rate", weapon.fireRate],
    ["Max DPS", weapon.dps],
    ["Delivery", weapon.projectileSpeed],
    ["Ammo", weapon.ammo],
  ] as const;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${weapon.name} — Quake III Arena weapon guide`,
      description: weapon.overview,
      url: absoluteUrl(`/weapons/${weapon.slug}`),
      isPartOf: { "@type": "VideoGame", name: "Quake III Arena" },
      author: { "@type": "Organization", name: "Q3JS", url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Weapons", item: absoluteUrl("/weapons") },
        { "@type": "ListItem", position: 3, name: weapon.name, item: absoluteUrl(`/weapons/${weapon.slug}`) },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ "--weapon-accent": weapon.accent } as React.CSSProperties}>
      <JsonLd data={structuredData} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 md:pt-9">
        <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Q3JS</Link>
          <span aria-hidden="true">/</span>
          <Link href="/weapons" className="hover:text-foreground">Weapons</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--weapon-accent)]">{weapon.shortName}</span>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <div className="flex flex-col py-2 lg:py-6">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--weapon-accent)]">
              <span>Weapon {String(weapon.number).padStart(2, "0")}</span>
              <span className="h-px w-12 bg-[var(--weapon-accent)] opacity-60" />
              <span>{weapon.range}</span>
            </div>
            <h1 className="mt-5 text-4xl font-black uppercase leading-none tracking-[0.015em] sm:text-6xl lg:text-7xl">
              {weapon.name}
            </h1>
            <p className="mt-5 text-lg font-bold uppercase leading-7 tracking-[0.04em]">{weapon.intro}</p>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">{weapon.overview}</p>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              {weapon.bestFor.map((use) => (
                <li key={use} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="size-1 bg-[var(--weapon-accent)]" aria-hidden="true" />
                  {use}
                </li>
              ))}
            </ul>
          </div>
          <WeaponModelViewer accent={weapon.accent} model={weapon.model} weaponName={weapon.name} />
        </section>

        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border border-border/70 bg-card px-5 py-6 sm:grid-cols-5 sm:px-7">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-sm font-bold uppercase leading-5 tracking-[0.025em]">{value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="usage-heading" className="mt-16 scroll-mt-24">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--weapon-accent)]">Live telemetry</p>
              <h2 id="usage-heading" className="mt-2 text-2xl font-black uppercase tracking-[0.035em]">Used on Q3JS</h2>
            </div>
            <span className="hidden text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:block">Direct + splash kills combined</span>
          </div>
          <WeaponUsage slug={weapon.slug} />
        </section>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="techniques-heading">
            <div className="mb-5 flex items-center gap-3 border-b border-border/70 pb-4">
              <Target className="size-5 text-[var(--weapon-accent)]" weight="bold" />
              <h2 id="techniques-heading" className="text-xl font-black uppercase tracking-[0.04em]">Core techniques</h2>
            </div>
            <ol className="space-y-7">
              {weapon.techniques.map((technique, index) => (
                <li key={technique.title} className="grid grid-cols-[2rem_1fr] gap-3 border-l border-[var(--weapon-accent)]/35 py-1 pl-4">
                  <span className="text-xs font-bold text-[var(--weapon-accent)]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.04em]">{technique.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{technique.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="counters-heading">
            <div className="mb-5 flex items-center gap-3 border-b border-border/70 pb-4">
              <ShieldChevron className="size-5 text-[var(--weapon-accent)]" weight="bold" />
              <h2 id="counters-heading" className="text-xl font-black uppercase tracking-[0.04em]">How to counter it</h2>
            </div>
            <div className="space-y-7">
              {weapon.counters.map((counter) => (
                <article key={counter.title} className="border-l border-border/80 py-1 pl-4">
                  <h3 className="text-sm font-bold uppercase tracking-[0.04em]">{counter.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{counter.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section aria-labelledby="arsenal-heading" className="mt-16 border-t border-border/70 pt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="arsenal-heading" className="text-xs font-bold uppercase tracking-[0.14em]">Full arsenal</h2>
            <Link href="/weapons" className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary">View weapon index →</Link>
          </div>
          <div className="grid grid-cols-3 gap-px border border-border/70 bg-border/70 sm:grid-cols-5 lg:grid-cols-9">
            {weapons.map((item) => (
              <Link
                key={item.slug}
                href={`/weapons/${item.slug}`}
                aria-current={item.slug === weapon.slug ? "page" : undefined}
                className={`group flex min-h-16 items-center gap-2 bg-card px-3 py-3 transition-colors hover:bg-secondary ${item.slug === weapon.slug ? "text-[var(--weapon-accent)]" : "text-foreground"}`}
              >
                <span className="text-[10px] text-muted-foreground">{String(item.number).padStart(2, "0")}</span>
                <span className="min-w-0 break-words text-[9px] font-bold uppercase leading-4 tracking-[0.04em] group-hover:text-primary">{item.shortName}</span>
              </Link>
            ))}
          </div>
        </section>

        <nav aria-label="Adjacent weapons" className="mt-4 grid divide-y divide-border/70 border border-border/70 bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Link href={`/weapons/${adjacent.previous.slug}`} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-secondary">
            <ArrowLeft className="size-5 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
            <span><span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Previous</span><span className="mt-1 block font-bold uppercase">{adjacent.previous.name}</span></span>
          </Link>
          <Link href={`/weapons/${adjacent.next.slug}`} className="group flex items-center justify-end gap-4 px-4 py-4 text-right transition-colors hover:bg-secondary">
            <span><span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Next</span><span className="mt-1 block font-bold uppercase">{adjacent.next.name}</span></span>
            <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
