"use client";

import Link from "next/link";
import { List } from "@phosphor-icons/react";
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

export function MobileSiteMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="-mr-2 md:hidden"
          aria-label="Open navigation"
        >
          <List className="size-5" weight="bold" />
        </Button>
      </SheetTrigger>

      <SheetContent className="max-w-[22rem]" aria-describedby="mobile-navigation-description">
        <SheetHeader>
          <SheetTitle>Q3JS menu</SheetTitle>
          <SheetDescription id="mobile-navigation-description">
            Play, host, or run your own Quake III server.
          </SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="min-h-0 flex-1 overflow-y-auto border-t border-border">
          {navItems.map((item) => (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                className="block border-b border-border px-5 py-5 transition-colors hover:bg-muted"
              >
                <span className="block font-mono text-sm font-bold uppercase tracking-[0.05em]">{item.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
