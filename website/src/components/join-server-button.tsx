import type {Q3ResolvedServer} from "@/lib/q3.ts";
import {useLocalStorage} from "@uidotdev/usehooks";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Zap} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {env} from "@/env.ts";

export function JoinServerButton(props: {
    server: Q3ResolvedServer,
}) {
    const [name, setName] = useLocalStorage("name", "Q3JS Player")

    const baseUrl = env.VITE_GAME_URL ? env.VITE_GAME_URL : "";

    return <Dialog>
        <DialogTrigger asChild>
            <Button
                size="lg"
                className="lg:w-auto w-full bg-primary text-primary-foreground font-bold"
                disabled={props.server.players >= props.server.sv_maxclients}
            >
                {props.server.players >= props.server.sv_maxclients
                    ? "Server Full"
                    : <>
                        <Zap className="h-4 w-4 mr-2"/>Connect
                    </>}
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Choose a name</DialogTitle>
                <DialogDescription>
                    Enter your player name to
                    join <strong>{props.server.sv_hostname}</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
                <Input
                    placeholder="Enter your player name"
                    className="mb-4"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <a href={`${baseUrl}/game?host=${props.server.host}&proxyPort=${props.server.proxyPort}`}>
                    <Button size="lg"
                            className="w-full bg-primary text-primary-foreground font-bold">
                        Join Server
                    </Button>
                </a>
            </div>
        </DialogContent>
    </Dialog>;
}