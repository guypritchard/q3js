import Image from "next/image";
import Link from "next/link";
import { DiscordLogo, GithubLogo, XLogo } from "@phosphor-icons/react/dist/ssr";
import { MasterStatus } from "@/components/master-status";
import { MobileSiteMenu } from "@/components/mobile-site-menu";
import { navItems } from "@/lib/site-navigation";
import { siteConfig } from "@/lib/seo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-3 sm:gap-5 sm:px-4">
        <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5" aria-label="Q3JS home">
          <Image src="/quake3.svg" alt="" width={24} height={24} className="size-6" priority />
          <span className="font-mono text-xl font-black uppercase tracking-[0.04em]">Q3JS</span>
          <span className="hidden font-mono text-xs text-muted-foreground min-[380px]:inline">1.0.0</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <MasterStatus />
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-sm uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={siteConfig.supportUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-primary px-2.5 py-1 font-mono text-sm font-bold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Support
          </a>
        </div>

        <div className="md:hidden">
          <MasterStatus />
        </div>

        <a
          href="https://github.com/lklacar/q3js"
          target="_blank"
          rel="noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-primary sm:block"
          aria-label="Q3JS on GitHub"
        >
          <GithubLogo className="size-5" weight="fill" />
        </a>
        <a
          href={siteConfig.author.xUrl}
          target="_blank"
          rel="author noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-primary sm:block"
          aria-label={`${siteConfig.author.name} on X`}
        >
          <XLogo className="size-5" weight="bold" />
        </a>
        <a
          href="https://discord.gg/mKvM9su443"
          target="_blank"
          rel="noreferrer"
          className="hidden text-muted-foreground transition-colors hover:text-primary sm:block"
          aria-label="Q3JS Discord"
        >
          <DiscordLogo className="size-5" weight="fill" />
        </a>
        <MobileSiteMenu />
      </div>
    </header>
  );
}
