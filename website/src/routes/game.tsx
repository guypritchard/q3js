import {createFileRoute} from '@tanstack/react-router'
import GamePage from "@/pages/GamePage.tsx";
import z from "zod";

const searchParams = z.object({
    host: z.string(),
    port: z.number()
})

export const Route = createFileRoute('/game')({
    component: GamePage,
    validateSearch: searchParams
})

