import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button.tsx";
import {SiGithub} from "react-icons/si";

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
                <Button variant={"outline"} asChild>
                    <a href={"https://github.com/lklacar/q3js"} target={"_blank"} rel={"noreferrer"}>
                        <SiGithub className="w-6 h-6 fill-white"/>
                        View on GitHub
                    </a>
                </Button>

                <Button asChild>
                    <Link to={"/guide"}>
                        Run your own server
                    </Link>
                </Button>
            </div>


        </div>
    </section>
}
