import {ServerPicker} from "@/components/server-picker"
import {Header} from "@/components/header.tsx";
import {Hero} from "@/components/hero.tsx";
import {Footer} from "@/components/footer.tsx";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-background">
            <Header/>
            <Hero/>
            <ServerPicker/>
            <Footer/>
        </main>
    )
}
