export const DEFAULT_TIME_ZONE = "UTC";
export const TIME_ZONE_COOKIE_NAME = "q3js-time-zone";

export function resolveBrowserTimeZone() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone && timeZone.trim().length > 0 ? timeZone : DEFAULT_TIME_ZONE;
}
