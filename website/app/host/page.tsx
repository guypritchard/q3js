import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { HostGame } from "@/components/host-game";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Host a Quake III Game in Your Browser",
  description: "Run an ephemeral Quake III Arena server directly in your browser and invite friends.",
};

export default function HostPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <HostGame />
      </main>
      <Footer />
    </div>
  );
}
