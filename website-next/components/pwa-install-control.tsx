"use client";

import {useEffect, useState} from "react";
import {DownloadIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {useLocalStorage} from "@/hooks/use-local-storage.ts";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog.tsx";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
}

function isStandaloneMode() {
    if (typeof window === "undefined") {
        return false;
    }

    const navigatorWithStandalone = navigator as Navigator & {
        standalone?: boolean;
    };

    return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIosSafari() {
    if (typeof window === "undefined") {
        return false;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
        /iphone|ipad|ipod/.test(userAgent) ||
        (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isSafariBrowser =
        /safari/.test(userAgent) &&
        !/crios|fxios|edgios|opr\//.test(userAgent);

    return isIosDevice && isSafariBrowser;
}

function isMobileDevice() {
    if (typeof window === "undefined") {
        return false;
    }

    const navigatorWithUserAgentData = navigator as Navigator & {
        userAgentData?: {
            mobile?: boolean;
        };
    };

    if (typeof navigatorWithUserAgentData.userAgentData?.mobile === "boolean") {
        return navigatorWithUserAgentData.userAgentData.mobile;
    }

    return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaInstallControl() {
    const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [open, setOpen] = useState(false);
    const [isIosManualInstall, setIsIosManualInstall] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [shouldAutoOpenOnLoad, setShouldAutoOpenOnLoad] = useState(false);
    const [shouldSuppressAutoOpen, setShouldSuppressAutoOpen] = useLocalStorage("pwa-install-dialog-suppressed", false);

    useEffect(() => {
        setShouldAutoOpenOnLoad(isMobileDevice());

        const updateInstallState = () => {
            const standalone = isStandaloneMode();
            setIsInstalled(standalone);
            setIsIosManualInstall(!standalone && isIosSafari());
        };

        const onBeforeInstallPrompt = (event: Event) => {
            const promptEvent = event as BeforeInstallPromptEvent;
            promptEvent.preventDefault();
            setInstallEvent(promptEvent);

            if (shouldAutoOpenOnLoad && !shouldSuppressAutoOpen) {
                setOpen(true);
            }
        };

        const onInstalled = () => {
            setInstallEvent(null);
            setIsInstalled(true);
            setOpen(false);
        };

        updateInstallState();
        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onInstalled);

        const standaloneMediaQuery = window.matchMedia("(display-mode: standalone)");
        standaloneMediaQuery.addEventListener("change", updateInstallState);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onInstalled);
            standaloneMediaQuery.removeEventListener("change", updateInstallState);
        };
    }, [shouldAutoOpenOnLoad, shouldSuppressAutoOpen]);

    useEffect(() => {
        if (isInstalled) {
            setOpen(false);
            return;
        }

        if (shouldAutoOpenOnLoad && !shouldSuppressAutoOpen && (installEvent || isIosManualInstall)) {
            setOpen(true);
        }
    }, [installEvent, isInstalled, isIosManualInstall, shouldAutoOpenOnLoad, shouldSuppressAutoOpen]);

    const canInstall = !isInstalled && (installEvent !== null || isIosManualInstall);

    async function handleInstall() {
        if (installEvent === null) {
            setOpen(true);
            return;
        }

        setIsInstalling(true);

        try {
            await installEvent.prompt();
            const {outcome} = await installEvent.userChoice;
            setInstallEvent(null);

            if (outcome === "accepted") {
                setIsInstalled(true);
            }
        } finally {
            setIsInstalling(false);
            setOpen(false);
        }
    }

    function handleSuppressAutoOpen() {
        setShouldSuppressAutoOpen(true);
        setOpen(false);
    }

    if (!canInstall) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-primary/30 text-primary hover:border-primary hover:text-primary"
                onClick={() => setOpen(true)}
            >
                <DownloadIcon className="size-4"/>
                Install
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="border-border/60 bg-card/95 sm:max-w-md">
                    <DialogHeader className="gap-3">
                        <DialogTitle>Install Q3JS</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-muted-foreground">
                            Install Q3JS for faster access, a cleaner fullscreen launch, and an app icon on your
                            device.
                        </DialogDescription>
                    </DialogHeader>

                    {installEvent ? (
                        <p className="rounded-md border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                            The browser will show one final confirmation after you continue.
                        </p>
                    ) : (
                        <div className="space-y-3 rounded-md border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                            <p>Open this site in Safari, tap the Share button, then choose Add to Home Screen.</p>
                            <p>After that, Q3JS will launch like a standalone app from your home screen.</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={handleSuppressAutoOpen}>
                            Don&apos;t show again
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Not now
                        </Button>
                        {installEvent ? (
                            <Button type="button" onClick={() => void handleInstall()} disabled={isInstalling}>
                                {isInstalling ? "Opening..." : "Install app"}
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
