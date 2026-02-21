import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button.tsx";
import {trackEvent} from "@/lib/analytics.ts";

export function Hero() {
    function scrollToServers() {
        trackEvent("cta_click", {target: "play_now", source: "hero"});
        document.getElementById("server-browser")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    return <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-5xl font-bold tracking-tight text-balance">
                Play Quake III Arena in your browser
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mx-auto text-balance leading-relaxed">
                Experience the thrill of Quake III Arena without any downloads or installations.
            </p>

            <div className="flex justify-center items-center gap-4 flex-wrap">
                <Button size="lg" onClick={scrollToServers}>
                    Play now
                </Button>

                <Button variant="secondary" asChild>
                    <Link
                        to={"/guide"}
                        onClick={() => trackEvent("cta_click", {target: "run_server", source: "hero"})}
                    >
                        Run your own server
                    </Link>
                </Button>
            </div>


        </div>
    </section>
}
