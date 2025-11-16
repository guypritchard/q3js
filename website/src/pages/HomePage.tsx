import {ServerPicker} from "@/components/server-picker"
import {Badge} from "@/components/ui/badge"
import {Link} from "@tanstack/react-router";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to={"/"} className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground">Q3JS</h1>
                            <p className="text-xs text-muted-foreground font-mono">v0.0.1</p>
                        </div>
                    </Link>
                    <Badge variant="outline" className="hidden sm:flex gap-1.5 border-primary/30 text-primary">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"/>
                        Online
                    </Badge>
                </div>
            </header>

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 md:py-24">
                <div className="mx-auto text-center space-y-6">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                        Play Quake III Arena in your browser
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground mx-auto text-balance leading-relaxed">
                        Experience the thrill of Quake III Arena without any downloads or installations.
                    </p>
                </div>
            </section>

            {/* Server Picker Section */}
            <section className="container mx-auto px-4 pb-24">
                <ServerPicker/>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/50 mt-16">
                <div className="container mx-auto px-4 py-8">
                    <div
                        className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p className="font-mono">Built with ❤️ by <span className="text-red-500">L</span><span
                            className="text-green-500">K</span></p>
                        <div className="flex items-center gap-4">
                            <a href="https://github.com/lklacar/q3js"
                               className="hover:text-foreground transition-colors">
                                GitHub
                            </a>
                            {/*<a href="#" className="hover:text-foreground transition-colors">*/}
                            {/*    Discord*/}
                            {/*</a>*/}
                            {/*<a href="#" className="hover:text-foreground transition-colors">*/}
                            {/*    Docs*/}
                            {/*</a>*/}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
