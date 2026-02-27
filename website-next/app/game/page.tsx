import GamePage from "@/views/GamePage";
import {Suspense} from "react";

export default function GameRoute() {
    return (
        <Suspense fallback={null}>
            <GamePage/>
        </Suspense>
    );
}
