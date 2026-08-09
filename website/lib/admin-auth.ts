const ADMIN_JWT_STORAGE_KEY = "q3js.admin.jwt";
const ADMIN_JWT_CHANGE_EVENT = "q3js:admin-jwt-change";

interface JwtPayload {
  exp?: number;
}

function payload(token: string): JwtPayload | undefined {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return undefined;
    const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as JwtPayload;
  } catch {
    return undefined;
  }
}

export function adminTokenExpiresAt(token: string): number | undefined {
  const expiresAt = payload(token)?.exp;
  return typeof expiresAt === "number" ? expiresAt * 1_000 : undefined;
}

export function readAdminToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const token = window.localStorage.getItem(ADMIN_JWT_STORAGE_KEY)?.trim();
  if (!token) return undefined;
  const expiresAt = adminTokenExpiresAt(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    window.localStorage.removeItem(ADMIN_JWT_STORAGE_KEY);
    return undefined;
  }
  return token;
}

export function storeAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_JWT_STORAGE_KEY, token);
  window.dispatchEvent(new Event(ADMIN_JWT_CHANGE_EVENT));
}

export function clearAdminToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ADMIN_JWT_STORAGE_KEY);
    window.dispatchEvent(new Event(ADMIN_JWT_CHANGE_EVENT));
  }
}

export function subscribeAdminToken(onChange: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === ADMIN_JWT_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", storage);
  window.addEventListener(ADMIN_JWT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(ADMIN_JWT_CHANGE_EVENT, onChange);
  };
}

export function adminTokenSnapshot(): string | undefined {
  return readAdminToken();
}

export function adminTokenServerSnapshot(): undefined {
  return undefined;
}
