"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, Crosshair } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackAnalyticsEvent } from "@/lib/analytics";

const COUNTER_STRIKE_URL = "https://csjs.live";
const HIDE_COUNTER_STRIKE_KEY = "q3js-hide-counter-strike-launch-prompt";
const ANALYTICS_COMPONENT = "homepage_counter_strike_dialog";

function trackCounterStrikeEvent(eventName: string) {
  trackAnalyticsEvent(eventName, { component: ANALYTICS_COMPONENT });
}

export function CounterStrikeDialog() {
  const [open, setOpen] = useState(false);
  const actionTaken = useRef(false);
  const dismissTracked = useRef(false);
  const optOutTracked = useRef(false);
  const visitTracked = useRef(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      try {
        const hidden = window.localStorage.getItem(HIDE_COUNTER_STRIKE_KEY) === "1";
        if (hidden) return;
      } catch {
        // Storage can be unavailable in strict privacy modes; the prompt can
        // still work for the current page view.
      }

      actionTaken.current = false;
      dismissTracked.current = false;
      optOutTracked.current = false;
      visitTracked.current = false;
      setOpen(true);
      trackCounterStrikeEvent("counter_strike_dialog_viewed");
    }, 900);

    return () => window.clearTimeout(showTimer);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && open && !actionTaken.current && !dismissTracked.current) {
      dismissTracked.current = true;
      trackCounterStrikeEvent("counter_strike_dialog_closed");
    }
    setOpen(nextOpen);
  }

  function visitCounterStrike() {
    actionTaken.current = true;
    if (visitTracked.current) return;
    visitTracked.current = true;
    trackCounterStrikeEvent("counter_strike_dialog_visited");
  }

  function neverShowAgain() {
    actionTaken.current = true;
    if (!optOutTracked.current) {
      optOutTracked.current = true;
      trackCounterStrikeEvent("counter_strike_dialog_do_not_show_again");
    }
    try {
      window.localStorage.setItem(HIDE_COUNTER_STRIKE_KEY, "1");
    } catch {
      // Closing the prompt still works when storage is unavailable.
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden border-primary/80 bg-card p-0 sm:max-w-xl">
        <div className="relative overflow-hidden border-b border-primary/40 bg-background px-6 py-8 sm:px-8 sm:py-10">
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-10 text-primary/10"
          >
            <Crosshair className="size-48 sm:size-56" weight="thin" />
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-2 bg-primary px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
              <span className="size-1.5 animate-pulse bg-primary-foreground" aria-hidden="true" />
              Now live
            </span>
            <p className="mt-5 font-mono text-4xl font-black uppercase leading-none tracking-[-0.06em] text-foreground sm:text-6xl">
              CSJS<span className="text-primary">.LIVE</span>
            </p>
            <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
              Counter-Strike in your browser
            </p>
          </div>
        </div>

        <div className="grid gap-5 px-6 pb-6 sm:px-8 sm:pb-8">
          <DialogHeader className="pt-1">
            <DialogTitle className="normal-case tracking-normal">
              We launched Counter-Strike
            </DialogTitle>
            <DialogDescription className="text-base leading-7">
              The newest game in the Q3JS family is ready. Pick a server and play classic Counter-Strike multiplayer—no download required.
            </DialogDescription>
          </DialogHeader>

          <Button asChild size="lg" className="h-12 w-full text-base normal-case tracking-normal">
            <a
              href={COUNTER_STRIKE_URL}
              target="_blank"
              rel="noreferrer"
              onClick={visitCounterStrike}
            >
              Play Counter-Strike
              <ArrowSquareOut weight="bold" />
            </a>
          </Button>

          <button
            type="button"
            onClick={neverShowAgain}
            className="mx-auto block text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Do not show again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
