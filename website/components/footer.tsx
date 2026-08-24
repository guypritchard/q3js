import Link from "next/link";
import { navItems } from "@/lib/site-navigation";

export function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-7 text-sm leading-6 text-muted-foreground">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.14em] text-primary">Q3JS // Browser arena</p>
          <p className="max-w-3xl">
            Q3JS is a non-commercial fan project using the officially released demo data and a
            GPL-licensed ioquake3 engine build. Not affiliated with id Software or ZeniMax.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-5 font-mono text-xs font-bold uppercase" aria-label="Footer navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
