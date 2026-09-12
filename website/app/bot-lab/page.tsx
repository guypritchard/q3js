import { BotLab } from "@/components/bot-lab";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ title: "Bot Lab", description: "Design and export format-compatible Quake III bot definitions locally in your browser.", path: "/bot-lab" });

export default function BotLabPage() {
  return <div className="min-h-screen bg-background text-foreground"><SiteHeader /><main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12"><BotLab /></main><Footer /></div>;
}
