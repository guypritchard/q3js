import {createFileRoute} from '@tanstack/react-router'
import GamePage from "@/pages/GamePage.tsx";
import z from "zod";

const searchParams = z.object({
    proxyIpHost: z.string(),
})

export const Route = createFileRoute('/game')({
    component: GamePage,
    validateSearch: searchParams
})

