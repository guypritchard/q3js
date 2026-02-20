import {ServerPicker} from "@/components/server-picker"
import {Hero} from "@/components/hero.tsx";
import {Suspense} from "react";
import ServerPickerSkeleton from "@/components/server-picker-skeleton.tsx";
import {ErrorBoundary} from 'react-error-boundary'
import {useSeo} from "@/hooks/use-seo.ts";

export default function HomePage() {
    useSeo({
        title: "Play Quake III Arena in Your Browser",
        description: "Play Quake III Arena instantly with no install. Q3JS brings the classic arena shooter to the web with WebAssembly and online servers.",
        path: "/",
    });

    return (
        <main>
            <Hero/>

            <ErrorBoundary fallback={<p role="alert">Something went wrong loading the server list.</p>}>
                <Suspense fallback={<ServerPickerSkeleton/>}>
                    <ServerPicker/>
                </Suspense>
            </ErrorBoundary>
        </main>
    )
}
