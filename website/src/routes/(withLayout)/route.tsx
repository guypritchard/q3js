import {createFileRoute} from '@tanstack/react-router'
import AppLayout from "@/layout/AppLayout.tsx";

export const Route = createFileRoute('/(withLayout)')({
    component: AppLayout,
})