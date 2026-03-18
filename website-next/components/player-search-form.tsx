import {Search} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {cn} from "@/lib/utils.ts";

export function PlayerSearchForm(props: {
    initialQuery?: string;
    className?: string;
    inputClassName?: string;
    buttonClassName?: string;
    buttonLabel?: string;
    autoFocus?: boolean;
}) {
    return (
        <form action="/players" method="get" className={cn("flex flex-col gap-3 sm:flex-row", props.className)}>
            <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                    type="search"
                    name="q"
                    defaultValue={props.initialQuery}
                    autoFocus={props.autoFocus}
                    placeholder="Search player name"
                    aria-label="Search player name"
                    className={cn("pl-9", props.inputClassName)}
                />
            </div>
            <Button type="submit" className={props.buttonClassName}>
                {props.buttonLabel ?? "Search"}
            </Button>
        </form>
    );
}
