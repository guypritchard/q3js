import Link from "next/link";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";

export default function WeaponNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto grid min-h-[65vh] w-full max-w-5xl place-items-center px-4 py-20 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Weapon not found</p>
          <h1 className="mt-4 text-4xl font-black uppercase">Unknown pickup</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">That weapon is not part of the Q3JS arsenal database.</p>
          <Link href="/weapons" className="mt-7 inline-flex bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground hover:bg-primary/80">Browse all weapons</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
