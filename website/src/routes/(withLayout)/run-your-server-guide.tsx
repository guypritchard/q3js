import { createFileRoute } from '@tanstack/react-router'
import RunYourServerGuide from "@/pages/RunYourServerGuide.tsx";

export const Route = createFileRoute('/(withLayout)/run-your-server-guide')({
  component: RunYourServerGuide,
})

