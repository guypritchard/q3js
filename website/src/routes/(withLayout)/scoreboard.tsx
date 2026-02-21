import {createFileRoute} from '@tanstack/react-router'
import ScoreboardPage from "@/pages/ScoreboardPage.tsx";

export const Route = createFileRoute('/(withLayout)/scoreboard')({
    component: ScoreboardPage,
})
