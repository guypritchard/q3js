"use client";

import {Footer} from "@/components/footer";
import {Header} from "@/components/header";

export function AppShell(props: { children: React.ReactNode }) {
    return (
        <main className="bg-background">
            <Header/>
            {props.children}
            <Footer/>
        </main>
    );
}
