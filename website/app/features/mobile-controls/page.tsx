import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";

const pagePath = "/play-quake-3-on-your-phone";
const pageTitle = "Play Quake 3 on Your Phone";
const pageDescription =
  "Play Quake 3 on your phone in a mobile browser with Q3JS. Learn how to start a match and use touch controls for movement, aiming, firing, jumping, crouching, and weapon switching.";

export const metadata: Metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: pagePath,
  image: {
    url: "/features/q3js-mobile-touch-controls.png",
    width: 1686,
    height: 774,
    alt: "Q3JS mobile touch controls while playing Quake III Arena",
  },
  keywords: [
    "Quake 3 mobile",
    "play Quake 3 on phone",
    "Quake III Arena mobile",
    "browser FPS mobile",
    "mobile touch controls",
    "Quake 3 browser game",
    "Q3JS mobile",
    "play Quake 3 online",
  ],
});

const frequentlyAskedQuestions = [
  {
    question: "Can you play Quake 3 on a phone?",
    answer:
      "Yes. Q3JS runs Quake III Arena in the browser and automatically presents touch controls on compatible touch devices. Turn your phone to landscape, choose a server, and join the match.",
  },
  {
    question: "Do I need to install a mobile app?",
    answer:
      "No. Q3JS is browser-based, so there is no app-store download or desktop installer. Open the site in your mobile browser and launch the game from the server list.",
  },
  {
    question: "What mobile controls are included?",
    answer:
      "The touch layout includes a movement joystick, drag-to-look aiming, fire, jump, crouch, previous and next weapon, scores, menu, and fullscreen controls when the browser supports fullscreen.",
  },
] as const;

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: absoluteUrl(pagePath),
    inLanguage: siteConfig.language,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: absoluteUrl("/features/q3js-mobile-touch-controls.png"),
      width: 1686,
      height: 774,
    },
    about: {
      "@type": "VideoGame",
      name: "Quake III Arena in Q3JS",
      gamePlatform: ["Mobile web browser", "Desktop web browser"],
      playMode: "MultiPlayer",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Q3JS", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Mobile controls", item: absoluteUrl(pagePath) },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: frequentlyAskedQuestions.map(({ answer, question }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to play Quake 3 on your phone",
    description: "Open Q3JS in a mobile browser, choose a server, rotate to landscape, and play using the touch controls.",
    totalTime: "PT2M",
    step: [
      { "@type": "HowToStep", position: 1, name: "Open Q3JS", text: "Open q3js.com in your phone's web browser." },
      { "@type": "HowToStep", position: 2, name: "Choose a server", text: "Select a live Quake III Arena server and enter your player name." },
      { "@type": "HowToStep", position: 3, name: "Rotate and play", text: "Rotate your phone to landscape and use the on-screen touch controls." },
    ],
  },
] satisfies ReadonlyArray<Record<string, unknown>>;

export default function MobileControlsFeaturePage() {
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
              <span className="text-primary">Play on your phone</span>
            </nav>
            <div className="mt-7 grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center md:gap-10">
              <div>
                <h1 className="font-mono text-3xl font-black uppercase leading-tight tracking-[0.03em] sm:text-4xl">
                  Play Quake 3 on your phone
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Yes—Q3JS runs Quake III Arena directly in your phone&apos;s web browser. There is no separate
                  mobile app to install; touch controls appear automatically when the game starts.
                </p>
                <Link
                  href="/#servers"
                  className="mt-6 inline-flex h-10 items-center justify-center bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.04em] text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  Choose a server
                </Link>
              </div>
              <figure>
                <div className="relative aspect-[1686/774] overflow-hidden border border-border/60 bg-black">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster="/features/q3js-mobile-touch-controls-poster.jpg"
                  aria-label="Q3JS mobile gameplay using the touch movement, aiming, and action controls"
                  className="h-full w-full object-cover motion-reduce:hidden"
                >
                  <source src="/features/q3js-mobile-touch-controls.mp4" type="video/mp4" />
                </video>
                <Image
                  src="/features/q3js-mobile-touch-controls-poster.jpg"
                  alt="Mobile Quake III Arena match in Q3JS showing the movement joystick, aim area, and touch buttons"
                  fill
                  priority
                  sizes="(max-width: 896px) 100vw, 864px"
                  className="hidden object-cover motion-reduce:block"
                />
                </div>
                <figcaption className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  Quake III Arena on a phone with Q3JS touch controls
                </figcaption>
              </figure>
            </div>
          </header>

          <section aria-labelledby="start-heading" className="mt-12 sm:mt-16">
            <h2 id="start-heading" className="font-mono text-xl font-bold uppercase tracking-[0.035em] sm:text-2xl">
              How to play Quake 3 on your phone
            </h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Open Q3JS", "Visit q3js.com in your phone's browser. No app download is needed."],
                ["02", "Choose a server", "Pick a live Quake III server and enter your player name."],
                ["03", "Rotate and play", "Turn the phone to landscape and use the on-screen controls."],
              ].map(([number, title, description]) => (
                <li key={number} className="flex flex-col bg-card p-4">
                  <span className="font-mono text-xs font-bold text-primary">{number}</span>
                  <h3 className="mt-6 font-mono text-sm font-bold uppercase tracking-[0.03em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="controls" aria-labelledby="controls-heading" className="scroll-mt-20 mt-12 sm:mt-16">
            <h2 id="controls-heading" className="font-mono text-xl font-bold uppercase tracking-[0.035em] sm:text-2xl">
              Touch control layout
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The overlay keeps movement under your left thumb and aiming and combat under your right.
            </p>

            <figure className="mt-5">
              <div
                className="relative min-h-[27rem] overflow-hidden bg-card sm:aspect-[16/7] sm:min-h-0"
                aria-label="Diagram showing the Q3JS mobile control layout"
              >
                <div className="absolute left-3 top-3 flex gap-1.5 sm:left-5 sm:top-5 sm:gap-2">
                  {[
                    ["Menu", "Open game menu"],
                    ["Scores", "Hold for scoreboard"],
                    ["Fullscreen", "When supported"],
                  ].map(([label, description]) => (
                    <div key={label} className="bg-background/80 px-2.5 py-2 text-center sm:px-3">
                      <span className="block font-mono text-[9px] font-bold uppercase text-foreground">{label}</span>
                      <span className="mt-0.5 hidden text-[8px] text-muted-foreground sm:block">{description}</span>
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-6 left-5 size-28 rounded-full bg-background/55 sm:bottom-7 sm:left-8 sm:size-36">
                  <div className="absolute inset-[24%] rounded-full bg-foreground/15" />
                  <span className="absolute inset-x-0 -top-6 text-center font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                    Move
                  </span>
                </div>

                <div className="absolute bottom-6 left-[38%] right-20 top-24 bg-background/25 sm:bottom-7 sm:left-[34%] sm:right-32 sm:top-24">
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-foreground">Swipe to look</span>
                      <span className="mt-2 hidden text-xs text-muted-foreground sm:block">Drag in any direction to aim</span>
                    </div>
                  </div>
                </div>

                <div className="absolute right-3 top-24 flex flex-col items-center gap-2 sm:right-6 sm:top-20">
                  <span className="flex size-12 items-center justify-center rounded-full bg-foreground/10 font-mono text-[8px] font-bold uppercase sm:size-14">Jump</span>
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/80 font-mono text-[10px] font-bold uppercase text-primary-foreground sm:size-20 sm:text-xs">Fire</span>
                  <span className="flex size-11 items-center justify-center rounded-full bg-background/65 font-mono text-[8px] font-bold uppercase sm:size-12">Duck</span>
                  <div className="flex gap-1.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-background/65 font-mono text-base" aria-label="Previous weapon">−</span>
                    <span className="flex size-9 items-center justify-center rounded-full bg-background/65 font-mono text-base" aria-label="Next weapon">+</span>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              </div>
              <figcaption className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-3 sm:gap-6">
                <span><strong className="text-foreground">Move:</strong> run, backpedal, and strafe.</span>
                <span><strong className="text-foreground">Look:</strong> drag to turn and aim.</span>
                <span><strong className="text-foreground">Fight:</strong> fire, jump, crouch, and switch weapons.</span>
              </figcaption>
            </figure>
          </section>

          <section aria-labelledby="faq-heading" className="mt-12 sm:mt-16">
            <h2 id="faq-heading" className="font-mono text-xl font-bold uppercase tracking-[0.035em] sm:text-2xl">Questions</h2>
            <div className="mt-5 grid gap-2">
              {frequentlyAskedQuestions.map(({ answer, question }) => (
                <details key={question} className="group bg-card p-4 open:bg-muted">
                  <summary className="cursor-pointer list-none font-mono text-sm font-bold uppercase leading-6 tracking-[0.02em] after:float-right after:text-primary after:content-['+'] group-open:after:content-['−']">
                    {question}
                  </summary>
                  <p className="mt-3 max-w-3xl pr-6 text-sm leading-6 text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="mobile-cta-heading" className="mt-12 bg-card p-4 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <h2 id="mobile-cta-heading" className="font-mono text-lg font-bold uppercase tracking-[0.03em]">
                Start a mobile match
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose a live server, enter your player name, and open the game on your phone.
              </p>
            </div>
            <Link
              href="/#servers"
              className="mt-4 inline-flex h-10 shrink-0 items-center justify-center bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.04em] text-primary-foreground transition-colors hover:bg-primary/80 sm:mt-0"
            >
              Choose a server
            </Link>
          </section>

          <nav aria-label="Related links" className="mt-12 flex flex-wrap gap-x-6 gap-y-3 font-mono text-sm">
            <Link href="/#servers" className="text-primary hover:text-foreground">Server list →</Link>
            <Link href="/guide" className="text-muted-foreground hover:text-foreground">Server guide →</Link>
            <a href="https://github.com/guypritchard/q3js" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">Source code ↗</a>
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  );
}
