"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {resolveBrowserTimeZone, TIME_ZONE_COOKIE_NAME} from "@/lib/time-zone";

function readCookie(name: string) {
    const prefix = `${name}=`;

    for (const cookie of document.cookie.split(";")) {
        const normalizedCookie = cookie.trim();
        if (normalizedCookie.startsWith(prefix)) {
            return decodeURIComponent(normalizedCookie.slice(prefix.length));
        }
    }

    return null;
}

export function TimeZoneSync() {
    const router = useRouter();

    useEffect(() => {
        const timeZone = resolveBrowserTimeZone();

        if (readCookie(TIME_ZONE_COOKIE_NAME) === timeZone) {
            return;
        }

        document.cookie = `${TIME_ZONE_COOKIE_NAME}=${encodeURIComponent(timeZone)}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
    }, [router]);

    return null;
}
