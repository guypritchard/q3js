import {ServerPicker} from "@/components/server-picker"
import {Hero} from "@/components/hero.tsx";
import {Suspense} from "react";
import ServerPickerSkeleton from "@/components/server-picker-skeleton.tsx";

export default function HomePage() {

    return (
        <>
            <Hero/>

            <Suspense fallback={<ServerPickerSkeleton/>}>
                <ServerPicker/>
            </Suspense>
        </>
    )
}
