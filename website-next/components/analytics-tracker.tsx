"use client";

import {trackAcquisitionTouchpoint, trackPageView} from "@/lib/analytics";
import {usePathname, useSearchParams} from "next/navigation";
import {useEffect} from "react";

export function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        trackAcquisitionTouchpoint();
    }, []);

    useEffect(() => {
        const search = searchParams?.toString() ?? "";
        const safePathname = pathname ?? "/";
        trackPageView(search ? `${safePathname}?${search}` : safePathname);
    }, [pathname, searchParams]);

    return null;
}
