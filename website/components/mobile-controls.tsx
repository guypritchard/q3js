"use client";

import type { Q3Client } from "@q3js/client";
import { useCallback, useEffect, useRef, useState } from "react";

const Q3_KEYS = {
  escape: 27,
  tab: 9,
  ctrl: 137,
  space: 32,
  crouch: 99,
  weaponPrevious: 91,
  weaponNext: 93,
} as const;

const AXIS_SCALE = 127;
const LOOK_SENSITIVITY = 2;
const TOP_BUTTON_CLASS =
  "border border-white/25 bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm";

interface MobileControlsProps {
  client: Q3Client;
  canRequestFullscreen: boolean;
  onRequestFullscreen: () => void;
}

interface ControlButtonProps {
  className: string;
  label: string;
  onPressStart: () => void;
  onPressEnd: () => void;
}

function ControlButton({ className, label, onPressStart, onPressEnd }: ControlButtonProps) {
  const activePointer = useRef<number | null>(null);

  const release = (pointerId: number) => {
    if (activePointer.current !== pointerId) return;
    activePointer.current = null;
    onPressEnd();
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (activePointer.current !== null) return;
        event.preventDefault();
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        onPressStart();
      }}
      onPointerUp={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
      onLostPointerCapture={(event) => release(event.pointerId)}
    >
      {label}
    </button>
  );
}

function MovementStick({ client }: { client: Q3Client }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });

  const release = useCallback(() => {
    pointer.current = null;
    setStickPosition({ x: 0, y: 0 });
    client.mobileJoystickAxis(0, 0);
    client.mobileJoystickAxis(1, 0);
  }, [client]);

  const update = (clientX: number, clientY: number) => {
    const bounds = baseRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const rawX = clientX - (bounds.left + bounds.width / 2);
    const rawY = clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(rawX, rawY);
    const scale = length > radius ? radius / length : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    setStickPosition({ x, y });
    client.mobileJoystickAxis(0, (x / radius) * AXIS_SCALE);
    client.mobileJoystickAxis(1, (y / radius) * AXIS_SCALE);
  };

  useEffect(() => release, [release]);

  return (
    <div
      ref={baseRef}
      aria-label="Movement joystick"
      className="pointer-events-auto absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] left-[max(.75rem,env(safe-area-inset-left))] size-[clamp(7.5rem,24dvh,10rem)] touch-none rounded-full border border-white/15 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.14),rgba(255,255,255,.04)_50%,rgba(0,0,0,.2))] backdrop-blur-sm"
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pointer.current !== event.pointerId) return;
        event.preventDefault();
        update(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (pointer.current === event.pointerId) release();
      }}
      onPointerCancel={(event) => {
        if (pointer.current === event.pointerId) release();
      }}
      onLostPointerCapture={(event) => {
        if (pointer.current === event.pointerId) release();
      }}
    >
      <div className="pointer-events-none absolute inset-[22%] rounded-full border border-dashed border-white/15" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_10px_24px_rgba(0,0,0,.24)]"
        style={{ transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))` }}
      />
    </div>
  );
}

export function MobileControls({
  client,
  canRequestFullscreen,
  onRequestFullscreen,
}: MobileControlsProps) {
  const lookPointer = useRef<number | null>(null);
  const lookPosition = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      client.mobileJoystickAxis(0, 0);
      client.mobileJoystickAxis(1, 0);
      for (const key of [Q3_KEYS.ctrl, Q3_KEYS.tab, Q3_KEYS.space, Q3_KEYS.crouch]) {
        client.mobileKey(key, false);
      }
    };
  }, [client]);

  const tapKey = (key: number) => {
    client.mobileKey(key, true);
    client.mobileKey(key, false);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden">
      <div className="pointer-events-auto absolute left-[max(.75rem,env(safe-area-inset-left))] top-[max(.75rem,env(safe-area-inset-top))] flex gap-2">
        <button type="button" className={TOP_BUTTON_CLASS} onClick={() => tapKey(Q3_KEYS.escape)}>
          Menu
        </button>
        <ControlButton
          className={TOP_BUTTON_CLASS}
          label="Scores"
          onPressStart={() => client.mobileKey(Q3_KEYS.tab, true)}
          onPressEnd={() => client.mobileKey(Q3_KEYS.tab, false)}
        />
        {canRequestFullscreen && (
          <button type="button" className={TOP_BUTTON_CLASS} onClick={onRequestFullscreen}>
            Fullscreen
          </button>
        )}
      </div>

      <MovementStick client={client} />

      <div
        aria-label="Look pad"
        className="pointer-events-auto absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] right-[max(5.5rem,calc(env(safe-area-inset-right)+4.75rem))] h-[42dvh] min-h-36 w-[42vw] max-w-sm touch-none border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.1),rgba(255,255,255,.025)_52%,rgba(0,0,0,.15))]"
        onPointerDown={(event) => {
          if (lookPointer.current !== null) return;
          event.preventDefault();
          lookPointer.current = event.pointerId;
          lookPosition.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (lookPointer.current !== event.pointerId || !lookPosition.current) return;
          event.preventDefault();
          const deltaX = (event.clientX - lookPosition.current.x) * LOOK_SENSITIVITY;
          const deltaY = (event.clientY - lookPosition.current.y) * LOOK_SENSITIVITY;
          lookPosition.current = { x: event.clientX, y: event.clientY };
          client.mobileMouseMove(deltaX, deltaY);
        }}
        onPointerUp={(event) => {
          if (lookPointer.current === event.pointerId) {
            lookPointer.current = null;
            lookPosition.current = null;
          }
        }}
        onPointerCancel={(event) => {
          if (lookPointer.current === event.pointerId) {
            lookPointer.current = null;
            lookPosition.current = null;
          }
        }}
      >
        <span className="pointer-events-none absolute inset-x-4 top-3 text-center text-[9px] font-bold uppercase tracking-[.32em] text-white/45">
          Look
        </span>
      </div>

      <div className="absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] right-[max(.75rem,env(safe-area-inset-right))] flex flex-col items-end gap-2">
        <ControlButton
          className="pointer-events-auto size-[clamp(3rem,10dvh,4rem)] rounded-full border border-white/25 bg-white/20 text-[9px] font-black uppercase text-white backdrop-blur-xl"
          label="Jump"
          onPressStart={() => client.mobileKey(Q3_KEYS.space, true)}
          onPressEnd={() => client.mobileKey(Q3_KEYS.space, false)}
        />
        <ControlButton
          className="pointer-events-auto size-[clamp(3.75rem,13dvh,5rem)] rounded-full border border-white/30 bg-white/25 text-xs font-black uppercase text-white backdrop-blur-xl"
          label="Fire"
          onPressStart={() => client.mobileKey(Q3_KEYS.ctrl, true)}
          onPressEnd={() => client.mobileKey(Q3_KEYS.ctrl, false)}
        />
        <ControlButton
          className="pointer-events-auto size-[clamp(2.75rem,9dvh,3.5rem)] rounded-full border border-white/20 bg-black/50 text-[8px] font-black uppercase text-white"
          label="Duck"
          onPressStart={() => client.mobileKey(Q3_KEYS.crouch, true)}
          onPressEnd={() => client.mobileKey(Q3_KEYS.crouch, false)}
        />
        <div className="pointer-events-auto flex gap-2">
          <button type="button" aria-label="Previous weapon" className="size-9 rounded-full border border-white/20 bg-black/50 text-lg text-white" onClick={() => tapKey(Q3_KEYS.weaponPrevious)}>
            −
          </button>
          <button type="button" aria-label="Next weapon" className="size-9 rounded-full border border-white/20 bg-black/50 text-lg text-white" onClick={() => tapKey(Q3_KEYS.weaponNext)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
