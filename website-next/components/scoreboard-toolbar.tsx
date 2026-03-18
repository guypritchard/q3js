"use client";

import {ReactNode} from "react";

export function ScoreboardToolbar(props: {
    actions: ReactNode;
    description: ReactNode;
    periodControls: ReactNode;
    search?: ReactNode;
}) {
    return (
        <div className="border-b border-border/60 p-4">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                        {props.description}
                    </div>

                    <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[20rem] xl:items-end">
                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            {props.actions}
                        </div>
                        <div className="space-y-2 xl:w-full">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Period Filter
                            </p>
                            {props.periodControls}
                        </div>
                    </div>
                </div>

                {props.search ? (
                    <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Player Search
                        </p>
                        {props.search}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
