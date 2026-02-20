import {createFileRoute, lazyRouteComponent} from '@tanstack/react-router'
import z from "zod";

const searchParams = z.object({
    host: z.string(),
    proxyPort: z.number(),
    name: z.string()
})

export const Route = createFileRoute('/game')({
    component: lazyRouteComponent(() => import("@/pages/GamePage.tsx")),
    validateSearch: searchParams
})
