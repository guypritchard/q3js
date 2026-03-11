import Link from "next/link";
import {Button} from "@/components/ui/button.tsx";

export function Hero() {
    return <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-5xl font-bold tracking-tight text-balance">
                Play Quake III Arena in your browser
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mx-auto text-balance leading-relaxed">
                Experience the thrill of Quake III Arena without any downloads or installations.
            </p>

            <div className="flex justify-center items-center gap-4 flex-wrap">
                <Button size="lg" asChild>
                    <Link href="#server-browser">
                        Play now
                    </Link>
                </Button>

                <Button variant="secondary" asChild>
                    <Link
                        href="/scoreboard"
                    >
                        Global Scoreboard
                    </Link>
                </Button>
            </div>


        </div>
    </section>
}
