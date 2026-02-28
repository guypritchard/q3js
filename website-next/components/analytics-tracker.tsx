"use client";

import {trackAcquisitionTouchpoint} from "@/lib/analytics";
import {useEffect} from "react";

export function AnalyticsTracker() {
    useEffect(() => {
        trackAcquisitionTouchpoint();
    }, []);

    return null;
}
