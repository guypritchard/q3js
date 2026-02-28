import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
import type {Q3ResolvedServer} from "@/lib/q3";
import React from "react";

export function AppShell(props: {
    children: React.ReactNode;
    initialServers: Q3ResolvedServer[];
}) {
    return (
        <div className="bg-background">
            <Header initialServers={props.initialServers}/>
            {props.children}
            <Footer/>
        </div>
    );
}
