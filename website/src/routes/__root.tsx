import {createRootRouteWithContext, Outlet, useLocation} from '@tanstack/react-router'
import {useEffect} from "react";

import type {QueryClient} from '@tanstack/react-query'
import {trackAcquisitionTouchpoint, trackPageView} from "@/lib/analytics.ts";

interface MyRouterContext {
    queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
    component: RootComponent,
})

function RootComponent() {
    const location = useLocation();

    useEffect(() => {
        trackAcquisitionTouchpoint();
    }, []);

    useEffect(() => {
        const pagePath =
            typeof location.search === "string"
                ? `${location.pathname}${location.search}`
                : `${location.pathname}${window.location.search}`;

        trackPageView(pagePath);
    }, [location.pathname, location.search]);

    return (
        <div className={"font-mono"}>
            <Outlet/>
        </div>
    );
}
