import {formatDistanceToNowStrict} from "date-fns";

export function formatRelativeLastOnline(value: string | null | undefined) {
    if (!value) {
        return "Unknown";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return formatDistanceToNowStrict(date, {
        addSuffix: true,
        roundingMethod: "floor",
    });
}

export function formatCompactLastOnline(value: string | null | undefined) {
    if (!value) {
        return "unknown";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "unknown";
    }

    const diffMs = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) {
        return "now";
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days}d ago`;
    }

    const months = Math.floor(days / 30);

    if (months < 12) {
        return `${months}mo ago`;
    }

    return `${Math.floor(days / 365)}y ago`;
}
