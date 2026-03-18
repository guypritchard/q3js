"use client";

import {useEffect} from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") {
            return;
        }

        if (typeof window === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) {
            return;
        }

        void navigator.serviceWorker.register("/sw.js", {
            scope: "/",
        }).catch(() => {
            // The app still works without offline caching; install support just won't be available.
        });
    }, []);

    return null;
}
