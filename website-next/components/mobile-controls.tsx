"use client";

import {useEffect, useRef} from "react";
import {
    initIOQ3MobileBindings,
    sendIOQ3MobileJoystickAxis,
    sendIOQ3MobileKey,
    sendIOQ3MobileMouseMove
} from "@/lib/ioquake3-runtime";
import {Q3_KEYS} from "@/lib/q3-mobile-controls";
import {IJoystickUpdateEvent, Joystick} from "@/components/joystick";

type MobileControlsProps = {
    canRequestFullscreen: boolean;
    onRequestFullscreen: () => void;
    portraitBlocked: boolean;
};

const LOOK_SENSITIVITY = 2;
const AXIS_SCALE = 127;
const TOP_ACTION_BUTTON_CLASS_NAME =
    "rounded-full border border-white/25 bg-black/50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white backdrop-blur-sm";

function ControlButton(props: {
    className: string;
    label: string;
    onPressStart: () => void;
    onPressEnd: () => void;
}) {
    const activePointerId = useRef<number | null>(null);

    return (
        <button
            type="button"
            className={props.className}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                activePointerId.current = event.pointerId;
                props.onPressStart();
            }}
            onPointerUp={(event) => {
                if (activePointerId.current !== event.pointerId) {
                    return;
                }
                activePointerId.current = null;
                props.onPressEnd();
            }}
            onPointerCancel={(event) => {
                if (activePointerId.current !== event.pointerId) {
                    return;
                }
                activePointerId.current = null;
                props.onPressEnd();
            }}
        >
            {props.label}
        </button>
    );
}

export function MobileControls({canRequestFullscreen, onRequestFullscreen, portraitBlocked}: MobileControlsProps) {
    const lookPointerId = useRef<number | null>(null);
    const lookPositionRef = useRef<{x: number; y: number} | null>(null);

    useEffect(() => {
        initIOQ3MobileBindings();
        return () => {
            sendIOQ3MobileJoystickAxis(0, 0);
            sendIOQ3MobileJoystickAxis(1, 0);
            sendIOQ3MobileKey(Q3_KEYS.ctrl, false);
            sendIOQ3MobileKey(Q3_KEYS.tab, false);
            sendIOQ3MobileKey(Q3_KEYS.space, false);
            sendIOQ3MobileKey(Q3_KEYS.crouch, false);
        };
    }, []);

    const releaseMovement = () => {
        sendIOQ3MobileJoystickAxis(0, 0);
        sendIOQ3MobileJoystickAxis(1, 0);
    };

    const handleMove = (event: IJoystickUpdateEvent) => {
        if (portraitBlocked) {
            releaseMovement();
            return;
        }

        const x = event.x ?? 0;
        const y = event.y ?? 0;
        sendIOQ3MobileJoystickAxis(0, Math.round(x * AXIS_SCALE));
        sendIOQ3MobileJoystickAxis(1, Math.round(-y * AXIS_SCALE));
    };

    const triggerMenu = () => {
        sendIOQ3MobileKey(Q3_KEYS.escape, true);
        sendIOQ3MobileKey(Q3_KEYS.escape, false);
    };

    return (
        <div className="pointer-events-none fixed inset-0 z-[80] select-none">
            <div className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] flex gap-3 pointer-events-auto">
                <button
                    type="button"
                    className={TOP_ACTION_BUTTON_CLASS_NAME}
                    onClick={triggerMenu}
                >
                    Menu
                </button>
                <ControlButton
                    className={TOP_ACTION_BUTTON_CLASS_NAME}
                    label="Scores"
                    onPressStart={() => sendIOQ3MobileKey(Q3_KEYS.tab, true)}
                    onPressEnd={() => sendIOQ3MobileKey(Q3_KEYS.tab, false)}
                />
                {canRequestFullscreen && (
                    <button
                        type="button"
                        className={TOP_ACTION_BUTTON_CLASS_NAME}
                        onClick={onRequestFullscreen}
                    >
                        Fullscreen
                    </button>
                )}
            </div>

            <div className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(255,255,255,0.05)_45%,rgba(0,0,0,0.18)_100%)] backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-[18%] rounded-full border border-dashed border-white/10"/>
                <Joystick
                    size={160}
                    stickSize={60}
                    throttle={16}
                    minDistance={12}
                    disabled={portraitBlocked}
                    baseColor="rgba(255,255,255,0.02)"
                    stickColor="rgba(255,255,255,0.24)"
                    move={handleMove}
                    stop={releaseMovement}
                />
            </div>

            <div
                className="pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(6.5rem,calc(env(safe-area-inset-right)+5rem))] h-[42dvh] min-h-52 w-[44vw] max-w-sm touch-none rounded-[2.5rem] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_48%,rgba(0,0,0,0.16)_100%)]"
                onPointerDown={(event) => {
                    if (portraitBlocked || lookPointerId.current !== null) {
                        return;
                    }
                    event.preventDefault();
                    lookPointerId.current = event.pointerId;
                    lookPositionRef.current = {x: event.clientX, y: event.clientY};
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                    if (portraitBlocked || lookPointerId.current !== event.pointerId || !lookPositionRef.current) {
                        return;
                    }
                    const dx = Math.round((event.clientX - lookPositionRef.current.x) * LOOK_SENSITIVITY);
                    const dy = Math.round((event.clientY - lookPositionRef.current.y) * LOOK_SENSITIVITY);
                    lookPositionRef.current = {x: event.clientX, y: event.clientY};
                    if (dx !== 0 || dy !== 0) {
                        sendIOQ3MobileMouseMove(dx, dy);
                    }
                }}
                onPointerUp={(event) => {
                    if (lookPointerId.current !== event.pointerId) {
                        return;
                    }
                    lookPointerId.current = null;
                    lookPositionRef.current = null;
                }}
                onPointerCancel={(event) => {
                    if (lookPointerId.current !== event.pointerId) {
                        return;
                    }
                    lookPointerId.current = null;
                    lookPositionRef.current = null;
                }}
            >
                <div className="absolute inset-x-8 top-5 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-white/55">
                    Look
                </div>
            </div>

            <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex flex-col items-end gap-3">
                <ControlButton
                    className="pointer-events-auto h-16 w-16 rounded-full border border-white/24 bg-[linear-gradient(155deg,rgba(220,244,255,0.28),rgba(255,255,255,0.08))] text-[10px] font-black uppercase tracking-[0.28em] text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_rgba(0,0,0,0.24)]"
                    label="Jump"
                    onPressStart={() => sendIOQ3MobileKey(Q3_KEYS.space, true)}
                    onPressEnd={() => sendIOQ3MobileKey(Q3_KEYS.space, false)}
                />
                <ControlButton
                    className="pointer-events-auto h-20 w-20 rounded-full border border-white/28 bg-[linear-gradient(155deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))] text-sm font-black uppercase tracking-[0.22em] text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_30px_rgba(0,0,0,0.3)]"
                    label="Fire"
                    onPressStart={() => {
                        sendIOQ3MobileKey(Q3_KEYS.ctrl, true);
                    }}
                    onPressEnd={() => sendIOQ3MobileKey(Q3_KEYS.ctrl, false)}
                />
                <ControlButton
                    className="pointer-events-auto h-14 w-14 rounded-full border border-white/20 bg-black/45 text-[9px] font-black uppercase tracking-[0.26em] text-white shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                    label="Duck"
                    onPressStart={() => sendIOQ3MobileKey(Q3_KEYS.crouch, true)}
                    onPressEnd={() => sendIOQ3MobileKey(Q3_KEYS.crouch, false)}
                />
                <div className="pointer-events-auto flex gap-2">
                    <button
                        type="button"
                        className="h-10 w-10 rounded-full border border-white/15 bg-black/45 text-lg text-white"
                        onClick={() => {
                            sendIOQ3MobileKey(Q3_KEYS.weaponPrev, true);
                            sendIOQ3MobileKey(Q3_KEYS.weaponPrev, false);
                        }}
                    >
                        -
                    </button>
                    <button
                        type="button"
                        className="h-10 w-10 rounded-full border border-white/15 bg-black/45 text-lg text-white"
                        onClick={() => {
                            sendIOQ3MobileKey(Q3_KEYS.weaponNext, true);
                            sendIOQ3MobileKey(Q3_KEYS.weaponNext, false);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}
