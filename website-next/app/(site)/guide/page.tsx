import type {Metadata} from "next";
import GuidePage from "@/views/GuidePage";

export const metadata: Metadata = {
    title: "Run Your Own Q3JS Server | Q3JS",
    description:
        "Step-by-step guide to run your own Q3JS Quake III server with Docker, required ports, and baseq3 setup instructions.",
    alternates: {
        canonical: "/guide",
    },
};

export default function GuideRoute() {
    return <GuidePage/>;
}
