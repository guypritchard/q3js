import {Header} from "@/components/header.tsx";
import {Footer} from "@/components/footer.tsx";
import {Outlet} from "@tanstack/react-router";


export default function AppLayout() {
    return <main className="bg-background">
        <Header/>
        <Outlet/>
        <Footer/>
    </main>
}