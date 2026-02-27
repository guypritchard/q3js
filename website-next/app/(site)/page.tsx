import type {Metadata} from "next";
import HomePage from "@/views/HomePage";

export const metadata: Metadata = {
    title: "Play Quake III Arena in Your Browser | Q3JS",
    description:
        "Play Quake III Arena instantly with no install. Q3JS brings the classic arena shooter to the web with WebAssembly and online servers.",
    alternates: {
        canonical: "/",
    },
};

export const dynamic = "force-dynamic";

export default function HomeRoute() {
    return <HomePage/>;
}
