const ACQUISITION_TRACKED_SESSION_KEY = "q3js-acquisition-tracked";

type AnalyticsPrimitive = string | number | boolean;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

function canTrack() {
    return typeof window !== "undefined" && typeof window.gtag === "function";
}

function toEventParams(params: Record<string, unknown>) {
    const normalized: Record<string, AnalyticsPrimitive> = {};

    for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            normalized[key] = value;
        }
    }

    return normalized;
}

function getCurrentPath() {
    if (typeof window === "undefined") return "/";
    return `${window.location.pathname}${window.location.search}`;
}

function getExternalReferrerHost() {
    if (typeof document === "undefined" || !document.referrer) return undefined;

    try {
        const referrerUrl = new URL(document.referrer);
        if (typeof window !== "undefined" && referrerUrl.hostname === window.location.hostname) {
            return undefined;
        }
        return referrerUrl.hostname;
    } catch {
        return undefined;
    }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
    if (!canTrack()) return;
    window.gtag?.("event", name, toEventParams(params));
}

export function trackPageView(pagePath?: string) {
    trackEvent("page_view", {
        page_path: pagePath ?? getCurrentPath(),
        page_location: typeof window === "undefined" ? undefined : window.location.href,
        page_title: typeof document === "undefined" ? undefined : document.title,
    });
}

export function trackAcquisitionTouchpoint() {
    if (typeof window === "undefined") return;

    try {
        if (sessionStorage.getItem(ACQUISITION_TRACKED_SESSION_KEY) === "1") return;

        const params = new URLSearchParams(window.location.search);
        const utmSource = params.get("utm_source");
        const utmMedium = params.get("utm_medium");
        const utmCampaign = params.get("utm_campaign");
        const utmTerm = params.get("utm_term");
        const utmContent = params.get("utm_content");
        const hasGclid = Boolean(params.get("gclid"));
        const referrerHost = getExternalReferrerHost();
        const hasCampaign =
            Boolean(utmSource) ||
            Boolean(utmMedium) ||
            Boolean(utmCampaign) ||
            Boolean(utmTerm) ||
            Boolean(utmContent) ||
            hasGclid;

        trackEvent("acquisition_touchpoint", {
            traffic_channel: hasCampaign ? "campaign" : referrerHost ? "referral" : "direct",
            utm_source: utmSource ?? undefined,
            utm_medium: utmMedium ?? undefined,
            utm_campaign: utmCampaign ?? undefined,
            utm_term: utmTerm ?? undefined,
            utm_content: utmContent ?? undefined,
            has_gclid: hasGclid,
            referrer_host: referrerHost ?? undefined,
        });

        sessionStorage.setItem(ACQUISITION_TRACKED_SESSION_KEY, "1");
    } catch {
        // Ignore storage errors and keep analytics non-blocking.
    }
}
