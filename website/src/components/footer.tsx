export function Footer() {
    return <footer className="border-t border-border/50 mt-16">

        <p className="container mx-auto px-4 py-8 text-sm text-muted-foreground">
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

        <div className="container mx-auto px-4 py-8">
            <div
                className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p className="font-mono">Built with ❤️ by <span className="text-red-500">L</span><span
                    className="text-green-500">K</span></p>
            </div>
        </div>
    </footer>;
}