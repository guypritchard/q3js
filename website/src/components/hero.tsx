import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button.tsx";

export function Hero() {
    return <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto text-center space-y-6">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                Play Quake III Arena in your browser
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground mx-auto text-balance leading-relaxed">
                Experience the thrill of Quake III Arena without any downloads or installations.
            </p>

            <p className="text-xs md:text-sm text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed font-mono">
                This project is a non-commercial fan implementation and is not affiliated with or endorsed by
                id Software or ZeniMax Media. “Quake III Arena” and related trademarks are the property of
                their respective owners.
                <br/><br/>
                Only the officially released Quake III Arena <span
                className="font-semibold">demo data files</span> are used.
                No full retail game assets are hosted, included, or required; all gameplay content is limited
                to files that id Software made publicly available for free.
                <br/><br/>
                The engine is based on <a href="https://github.com/ioquake/ioq3"
                                          className="font-semibold text-primary">ioquake3</a>,
                an open-source project licensed under GPLv2. In accordance with the license,
                the source code for the modified ioquake3 WebAssembly build and supporting glue code
                is available upon request.
            </p>


            {/*<div>*/}
            {/*    <Link to={"/run-your-server-guide"}>*/}
            {/*        <Button>*/}
            {/*            Run your own server*/}
            {/*        </Button>*/}
            {/*    </Link>*/}
            {/*</div>*/}



        </div>
    </section>;
}