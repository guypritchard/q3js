"use client";

import Link from "next/link";
import { DiscordLogo, GithubLogo, List, XLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navItems } from "@/lib/site-navigation";
import { siteConfig } from "@/lib/seo";

const socialLinks = [
  { label: "GitHub", href: "https://github.com/lklacar/q3js", icon: GithubLogo },
  { label: "X", href: siteConfig.author.xUrl, icon: XLogo },
  { label: "Discord", href: "https://discord.gg/mKvM9su443", icon: DiscordLogo },
] as const;

export function MobileSiteMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="-mr-2 lg:hidden"
          aria-label="Open navigation"
        >
          <List className="size-5" weight="bold" />
        </Button>
      </SheetTrigger>

      <SheetContent className="max-w-[22rem]" aria-describedby="mobile-navigation-description">
        <SheetHeader>
          <SheetTitle>Q3JS menu</SheetTitle>
          <SheetDescription id="mobile-navigation-description">
            Play, check rankings, or explore the arena.
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="flex-1 px-3 py-4">
          {navItems.map((item, index) => (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                className="flex min-h-12 items-center justify-between border-b border-border/60 px-3 py-3 font-mono text-sm font-bold uppercase tracking-[0.05em] transition-colors hover:bg-muted hover:text-primary"
              >
                <span>{item.label}</span>
                <span className="text-xs font-normal text-muted-foreground" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </Link>
            </SheetClose>
          ))}

          <a
            href={siteConfig.supportUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex min-h-12 items-center justify-center bg-primary px-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Support Q3JS
          </a>
        </nav>

        <div className="grid grid-cols-3 border-t border-border">
          {socialLinks.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-center gap-2 border-r border-border text-xs text-muted-foreground transition-colors last:border-r-0 hover:bg-muted hover:text-primary"
            >
              <Icon className="size-4" weight="fill" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
