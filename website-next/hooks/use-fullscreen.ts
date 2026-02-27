import {useEffect} from "react";

export function useFullscreenOnF11() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F11") {
                e.preventDefault();
                const el = document.documentElement;
                if (!document.fullscreenElement) {
                    el.requestFullscreen().catch(() => {
                    });
                } else {
                    document.exitFullscreen().catch(() => {
                    });
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
}