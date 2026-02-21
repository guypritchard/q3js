import {ServerPicker} from "@/components/server-picker"
import {Hero} from "@/components/hero.tsx";
import {Suspense} from "react";
import ServerPickerSkeleton from "@/components/server-picker-skeleton.tsx";
import {ErrorBoundary} from 'react-error-boundary'
import {useSeo} from "@/hooks/use-seo.ts";
import {QueryErrorResetBoundary} from "@tanstack/react-query";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "@tanstack/react-router";
import {ScoreboardPreview} from "@/components/scoreboard-preview.tsx";

export default function HomePage() {
    useSeo({
        title: "Play Quake III Arena in Your Browser",
        description: "Play Quake III Arena instantly with no install. Q3JS brings the classic arena shooter to the web with WebAssembly and online servers.",
        path: "/",
    });

    return (
        <main>
            <Hero/>
            <ScoreboardPreview/>

            <QueryErrorResetBoundary>
                {({reset}) => (
                    <ErrorBoundary
                        onReset={reset}
                        fallbackRender={({resetErrorBoundary}) => (
                            <div role="alert" className="container mx-auto px-4 pb-24">
                                <div className="max-w-5xl mx-auto rounded border border-destructive/50 bg-destructive/10 p-4">
                                    <p className="text-sm">Something went wrong loading the server list.</p>
                                    <Button
                                        variant="outline"
                                        className="mt-3"
                                        onClick={resetErrorBoundary}
                                    >
                                        Retry
                                    </Button>
                                    <Button className="mt-3 ml-2" asChild>
                                        <Link to="/guide">Run your own server</Link>
                                    </Button>
                                </div>
                            </div>
                        )}
                    >
                        <Suspense fallback={<ServerPickerSkeleton/>}>
                            <ServerPicker/>
                        </Suspense>
                    </ErrorBoundary>
                )}
            </QueryErrorResetBoundary>
        </main>
    )
}
