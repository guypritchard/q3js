import GamePage from "@/views/GamePage";
import type {Metadata} from "next";
import {Suspense} from "react";

export const metadata: Metadata = {
    title: "Play Quake III Arena | Q3JS",
    description: "Join a Q3JS server and play Quake III Arena in your browser.",
    robots: {
        index: false,
        follow: true,
    },
    alternates: {
        canonical: "/game",
    },
};

export default function GameRoute() {
    return (
        <Suspense fallback={null}>
            <GamePage/>
        </Suspense>
    );
}
