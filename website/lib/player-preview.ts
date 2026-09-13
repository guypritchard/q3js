/** Shared, browser-safe helpers for installed Quake III player previews. */
export function normalizePlayerQpath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();

  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("Invalid player resource path");
  }

  return normalized;
}

/** Return the sole skin file allowed for a normalized player selection. */
export function playerSkinCandidates(root: string, part: "lower" | "upper" | "head", skin: string, separateHead = ""): string[] {
  const selectedSkin = skin.trim().toLowerCase() || "default";
  const prefix = part === "head" && separateHead ? separateHead.trim().toLowerCase() : part;
  return [normalizePlayerQpath(`${root}/${prefix}_${selectedSkin}.skin`)];
}

export class PlayerResourceHttpError extends Error {
  readonly qpath: string;
  readonly status: number;
  constructor(qpath: string, status: number) { super(`${qpath} (${status})`); this.qpath = qpath; this.status = status; }
}

export function isPlayerResourceNotFound(error: unknown): boolean {
  return error instanceof PlayerResourceHttpError && error.status === 404;
}

export async function fetchFirstAvailable(paths: readonly string[], signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<{ path: string; response: Response }> {
  for (const path of paths) {
    const response = await fetcher(`/api/player-resource?q=${encodeURIComponent(path)}`, { signal });
    if (response.ok) return { path, response };
    if (response.status !== 404) throw new PlayerResourceHttpError(path, response.status);
  }
  throw new PlayerResourceHttpError(paths.join(", "), 404);
}
