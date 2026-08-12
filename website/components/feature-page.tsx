import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";

interface FeatureLink {
  href: string;
  label: string;
}

interface FeatureCard {
  description: string;
  eyebrow: string;
  title: string;
}

interface FeatureStep {
  description: string;
  title: string;
}

interface FeatureFaq {
  answer: string;
  question: string;
}

interface FeaturePageProps {
  breadcrumb: string;
  cards: readonly FeatureCard[];
  cardsIntro: string;
  cardsTitle: string;
  ctaDescription: string;
  ctaLink: FeatureLink;
  ctaTitle: string;
  eyebrow: string;
  facts: readonly { label: string; value: string }[];
  faq: readonly FeatureFaq[];
  intro: string;
  primaryAction: FeatureLink;
  relatedLinks: readonly FeatureLink[];
  secondaryAction?: FeatureLink;
  steps: readonly FeatureStep[];
  stepsIntro: string;
  stepsTitle: string;
  structuredData: readonly Record<string, unknown>[];
  title: string;
  visual: ReactNode;
}

function ActionLink({ href, label, primary = false }: Readonly<FeatureLink & { primary?: boolean }>) {
  const className = primary
    ? "inline-flex h-10 items-center justify-center gap-2 bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.04em] text-primary-foreground transition-colors hover:bg-primary/80"
    : "inline-flex h-10 items-center justify-center gap-2 bg-secondary px-4 font-mono text-sm font-bold uppercase tracking-[0.04em] text-secondary-foreground transition-colors hover:bg-secondary/80";

  if (/^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noreferrer" className={className}>{label}<ArrowRight /></a>;
  }
  return <Link href={href} className={className}>{label}<ArrowRight /></Link>;
}

export function FeaturePage({
  breadcrumb,
  cards,
  cardsIntro,
  cardsTitle,
  ctaDescription,
  ctaLink,
  ctaTitle,
  eyebrow,
  facts,
  faq,
  intro,
  primaryAction,
  relatedLinks,
  secondaryAction,
  steps,
  stepsIntro,
  stepsTitle,
  structuredData,
  title,
  visual,
}: Readonly<FeaturePageProps>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={structuredData} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:pb-20 sm:pt-12">
        <article>
          <header>
            <nav aria-label="Breadcrumb" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Link href="/" className="hover:text-primary">Q3JS</Link>
              <span className="px-2 text-border" aria-hidden="true">/</span>
              <span className="text-primary">{breadcrumb}</span>
            </nav>

            <div className="mt-7 grid gap-8 md:grid-cols-[.9fr_1.1fr] md:items-center md:gap-10">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
                <h1 className="mt-3 font-mono text-3xl font-black uppercase leading-tight tracking-[0.03em] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{intro}</p>
                <div className="mt-6 flex flex-col gap-2 min-[380px]:flex-row">
                  <ActionLink {...primaryAction} primary />
                  {secondaryAction && <ActionLink {...secondaryAction} />}
                </div>
              </div>
              {visual}
            </div>

            <dl className="mt-8 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {facts.map(({ label, value }) => (
                <div key={label} className="bg-card/60 px-4 py-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-mono text-sm font-bold uppercase tracking-[0.025em]">{value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <section aria-labelledby="feature-details-heading" className="mt-12 sm:mt-16">
            <h2 id="feature-details-heading" className="font-mono text-xl font-bold uppercase tracking-[0.035em] sm:text-2xl">
              {cardsTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{cardsIntro}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {cards.map(({ description, eyebrow: cardEyebrow, title: cardTitle }) => (
                <section key={cardTitle} className="bg-card p-5 sm:p-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{cardEyebrow}</p>
                  <h3 className="mt-4 font-mono text-base font-bold uppercase tracking-[0.03em]">{cardTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </section>
              ))}
            </div>
          </section>

          <section aria-labelledby="feature-steps-heading" className="mt-12 sm:mt-16">
            <div className="grid gap-3 md:grid-cols-[.75fr_1.25fr] md:gap-10">
              <div>
                <h2 id="feature-steps-heading" className="font-mono text-xl font-bold uppercase tracking-[0.035em] sm:text-2xl">
                  {stepsTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{stepsIntro}</p>
              </div>
              <ol className="grid gap-2">
                {steps.map(({ description, title: stepTitle }, index) => (
                  <li key={stepTitle} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 bg-card/60 p-4">
                    <span className="font-mono text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.03em]">{stepTitle}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section aria-labelledby="feature-faq-heading" className="mt-12 sm:mt-16">
            <h2 id="feature-faq-heading" className="font-mono text-xl font-bold uppercase tracking-[0.035em] sm:text-2xl">Questions</h2>
            <div className="mt-5 grid gap-2">
              {faq.map(({ answer, question }) => (
                <details key={question} className="group bg-card p-4 open:bg-muted">
                  <summary className="cursor-pointer list-none font-mono text-sm font-bold uppercase leading-6 tracking-[0.02em] after:float-right after:text-primary after:content-['+'] group-open:after:content-['−']">
                    {question}
                  </summary>
                  <p className="mt-3 max-w-3xl pr-6 text-sm leading-6 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="feature-cta-heading" className="mt-12 bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6">
            <div>
              <h2 id="feature-cta-heading" className="font-mono text-lg font-bold uppercase tracking-[0.03em]">{ctaTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{ctaDescription}</p>
            </div>
            <div className="mt-4 shrink-0 sm:mt-0">
              <ActionLink {...ctaLink} primary />
            </div>
          </section>

          <nav aria-label="Related links" className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-sm">
            {relatedLinks.map(({ href, label }, index) => (
              /^https?:\/\//.test(href) ? (
                <a key={href} href={href} target="_blank" rel="noreferrer" className={index === 0 ? "text-primary hover:text-foreground" : "text-muted-foreground hover:text-foreground"}>
                  {label} ↗
                </a>
              ) : (
                <Link key={href} href={href} className={index === 0 ? "text-primary hover:text-foreground" : "text-muted-foreground hover:text-foreground"}>
                  {label} →
                </Link>
              )
            ))}
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  );
}
