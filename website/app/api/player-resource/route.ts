import { NextRequest, NextResponse } from "next/server";
import { getPlayerAssetStore, PlayerAssetError, validatePlayerQpath } from "@/lib/server/player-assets";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { md3: "application/octet-stream", skin: "text/plain; charset=utf-8", cfg: "text/plain; charset=utf-8", tga: "application/octet-stream", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const qpath = validatePlayerQpath(request.nextUrl.searchParams.get("q") ?? "");
    const bytes = await (await getPlayerAssetStore()).read(qpath);
    if (!bytes) return NextResponse.json({ error: "Player resource not found" }, { status: 404, headers: { "Cache-Control": "public, max-age=30" } });
    const extension = qpath.slice(qpath.lastIndexOf(".") + 1);
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": TYPES[extension] ?? "application/octet-stream", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const status = error instanceof PlayerAssetError ? error.status : 500;
    return NextResponse.json({ error: status === 500 ? "Could not read player data" : (error as Error).message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
