import {createFileRoute} from '@tanstack/react-router'
import GuidePage from "@/pages/GuidePage.tsx";

export const Route = createFileRoute('/(withLayout)/guide')({
    component: GuidePage,
})
