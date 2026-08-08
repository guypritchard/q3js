"use client";

import { type RefObject, useCallback, useEffect, useState } from "react";

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

function isIPhone(): boolean {
  return /iPhone/i.test(navigator.userAgent);
}

export function useMobileGame(targetRef: RefObject<HTMLElement | null>) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [hasSeenLandscape, setHasSeenLandscape] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [canRequestFullscreen, setCanRequestFullscreen] = useState(false);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const orientation = screen.orientation;

    const updateTouchDevice = () => {
      const forced = new URLSearchParams(window.location.search).get("mobileControls") === "1";
      setIsTouchDevice(forced || pointerQuery.matches || navigator.maxTouchPoints > 0);
    };
    const updateOrientation = () => {
      const target = targetRef.current;
      const bounds = target?.getBoundingClientRect();
      const width = bounds?.width || window.innerWidth;
      const height = bounds?.height || window.innerHeight;
      const nextIsLandscape = width >= height;
      setIsLandscape(nextIsLandscape);
      setHasSeenLandscape((seen) => seen || nextIsLandscape);
      setIsViewportReady(true);
    };
    const updateFullscreenSupport = () => {
      const target = targetRef.current as FullscreenCapableElement | null;
      setCanRequestFullscreen(
        !isIPhone() && Boolean(document.fullscreenEnabled || target?.webkitRequestFullscreen),
      );
    };

    updateTouchDevice();
    updateOrientation();
    updateFullscreenSupport();

    pointerQuery.addEventListener("change", updateTouchDevice);
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    orientation?.addEventListener("change", updateOrientation);

    return () => {
      pointerQuery.removeEventListener("change", updateTouchDevice);
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
      orientation?.removeEventListener("change", updateOrientation);
    };
  }, [targetRef]);

  const requestLandscapeFullscreen = useCallback(async () => {
    const target = (targetRef.current ?? document.documentElement) as FullscreenCapableElement;
    if (!document.fullscreenElement) {
      const request = target.requestFullscreen?.bind(target)
        ?? target.webkitRequestFullscreen?.bind(target);
      await Promise.resolve(request?.()).catch(() => undefined);
    }

    const orientation = screen.orientation as LockableOrientation;
    await orientation?.lock?.("landscape").catch(() => undefined);
  }, [targetRef]);

  return {
    isTouchDevice,
    isLandscape,
    hasSeenLandscape,
    isViewportReady,
    canRequestFullscreen,
    requestLandscapeFullscreen,
  };
}
