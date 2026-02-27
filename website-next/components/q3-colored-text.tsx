import {Fragment, useMemo} from "react";
import {cn} from "@/lib/utils.ts";

const Q3_COLOR_MAP: Record<string, string> = {
    "0": "#000000",
    "1": "#ff4040",
    "2": "#40ff40",
    "3": "#ffff40",
    "4": "#5ca5ff",
    "5": "#40ffff",
    "6": "#ff66ff",
    "7": "currentColor",
    "8": "#ffb347",
    "9": "#c8c8c8",
};

interface Segment {
    text: string;
    color?: string;
}

function parseQ3ColoredText(value: string): Segment[] {
    const segments: Segment[] = [];
    let color: string | undefined;
    let buffer = "";

    function flushBuffer() {
        if (!buffer) return;
        segments.push({text: buffer, color});
        buffer = "";
    }

    for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        const next = value[i + 1];

        if (ch === "^" && next) {
            if (next === "^") {
                buffer += "^";
                i++;
                continue;
            }

            const nextColor = Q3_COLOR_MAP[next];
            if (nextColor) {
                flushBuffer();
                color = nextColor === "currentColor" ? undefined : nextColor;
                i++;
                continue;
            }
        }

        buffer += ch;
    }

    flushBuffer();
    return segments;
}

export function Q3ColoredText(props: { text: string; className?: string }) {
    const segments = useMemo(() => parseQ3ColoredText(props.text), [props.text]);

    return (
        <span className={cn("align-middle", props.className)}>
            {segments.map((segment, index) => (
                <Fragment key={`${index}-${segment.text}`}>
                    {segment.color ? (
                        <span style={{color: segment.color}}>{segment.text}</span>
                    ) : (
                        segment.text
                    )}
                </Fragment>
            ))}
        </span>
    );
}
