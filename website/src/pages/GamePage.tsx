import {useEffect, useState} from "react";
// @ts-ignore
import ioquake3 from "@/lib/ioquake3.js";
import wasm from "@/lib/ioquake3.wasm?url";
import {Card} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";

const config = {
    baseq3: {
        files: [
            {src: "baseq3/pak0.pk3", dst: "/baseq3"},
            {src: "baseq3/pak1.pk3", dst: "/baseq3"},
            {src: "baseq3/pak2.pk3", dst: "/baseq3"},
            {src: "baseq3/pak3.pk3", dst: "/baseq3"},
            {src: "baseq3/pak4.pk3", dst: "/baseq3"},
            {src: "baseq3/pak5.pk3", dst: "/baseq3"},
            {src: "baseq3/pak6.pk3", dst: "/baseq3"},
            {src: "baseq3/pak7.pk3", dst: "/baseq3"},
            {src: "baseq3/pak8.pk3", dst: "/baseq3"},
            {src: "baseq3/vm/cgame.qvm", dst: "/baseq3/vm"},
            {src: "baseq3/vm/qagame.qvm", dst: "/baseq3/vm"},
            {src: "baseq3/vm/ui.qvm", dst: "/baseq3/vm"},
        ],
    },
} as const;

// Monkey patch WebSocket to allow self-signed
const OriginalWebSocket = WebSocket as any;
// @ts-ignore
WebSocket = function (url: string, protocols?: string | string[], options: any = {}) {
    options.rejectUnauthorized = false;
    return new OriginalWebSocket(url, protocols, options);
};
Object.setPrototypeOf(WebSocket, OriginalWebSocket);

type Prog = { received: number; total: number; pct: number; current?: string };

// Persistent data versioning
const DATA_VERSION = "v1";
const VERSION_KEY = "ioq3-data-version";

// Sync helper
function syncfs(module: any, populate: boolean) {
    return new Promise<void>((resolve, reject) => {
        try {
            module.FS.syncfs(populate, (err: any) => (err ? reject(err) : resolve()));
        } catch (e) {
            reject(e);
        }
    });
}

// Resolve IDBFS across different Emscripten variants
function resolveIDBFS(module: any) {
    // Newer: module.FS.filesystems.IDBFS
    if (module?.FS?.filesystems?.IDBFS) return module.FS.filesystems.IDBFS;
    // Some bundles expose module.IDBFS
    if (module?.IDBFS) return module.IDBFS;
    // Legacy global
    // @ts-ignore
    if ((globalThis as any).IDBFS) return (globalThis as any).IDBFS;
    return null;
}

async function ensureMounts(module: any): Promise<{persist: boolean}> {
    const { FS } = module;
    FS.mkdirTree("/baseq3");
    FS.mkdirTree("/baseq3/vm");

    const IDBFS = resolveIDBFS(module);
    if (!IDBFS) {
        console.warn("[ioq3] IDBFS not linked. Running without persistence.");
        return { persist: false };
    }

    // Mount once at /baseq3; /baseq3/vm lives under same tree so no need for a second mount.
    try {
        FS.mount(IDBFS, {}, "/baseq3");
    } catch (e) {
        // Already mounted or race during hot reload
        // If already mounted, proceed.
    }

    const current = localStorage.getItem(VERSION_KEY);
    if (current !== DATA_VERSION) {
        try {
            // Populate first so we can clean reliably
            await syncfs(module, true);
            // Remove files to force re-download
            for (const e of FS.readdir("/baseq3")) {
                if (e === "." || e === "..") continue;
                const p = `/baseq3/${e}`;
                try {
                    const stat = FS.stat(p);
                    // crude dir check: dirs have mode & 0o40000
                    if ((stat.mode & 0o40000) === 0o40000) {
                        // shallow clean: remove known child files only if needed
                        try {
                            for (const c of FS.readdir(p)) {
                                if (c === "." || c === "..") continue;
                                try { FS.unlink(`${p}/${c}`); } catch {}
                            }
                            FS.rmdir(p);
                        } catch { /* ignore */ }
                    } else {
                        FS.unlink(p);
                    }
                } catch { /* ignore */ }
            }
            await syncfs(module, false);
            localStorage.setItem(VERSION_KEY, DATA_VERSION);
        } catch (e) {
            console.warn("[ioq3] Version reset failed, continuing:", e);
        }
    }

    // Populate from IndexedDB
    await syncfs(module, true);
    return { persist: true };
}

export default function GamePage() {
    const [prog, setProg] = useState<Prog>({received: 0, total: 0, pct: 0, current: ""});

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const com_basegame = "baseq3" as const;
        const fs_basegame = "baseq3" as const;
        const fs_game = "baseq3" as const;

        let generatedArguments = `
      +set sv_pure 0
      +set net_enabled 1
      +set r_mode -2
      +set com_basegame "${com_basegame}"
      +set fs_basegame "${fs_basegame}"
      +set fs_game "${fs_game}"
    `;
        generatedArguments += ` +connect server.q3js.com:443`;

        const queryArgs = urlParams.get("args");
        if (queryArgs) generatedArguments += ` ${queryArgs} `;

        const dataURL = new URL(location.origin + location.pathname);

        function toUint8(chunks: Uint8Array[], totalLen: number) {
            const out = new Uint8Array(totalLen);
            let off = 0;
            for (const c of chunks) {
                out.set(c, off);
                off += c.length;
            }
            return out;
        }

        async function streamToArrayBuffer(resp: Response, onChunk: (n: number) => void) {
            if (!resp.body) {
                const buf = await resp.arrayBuffer();
                onChunk(buf.byteLength);
                return new Uint8Array(buf);
            }
            const reader = resp.body.getReader();
            const chunks: Uint8Array[] = [];
            for (;;) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value!);
                onChunk(value!.length);
            }
            const totalLen = chunks.reduce((s, c) => s + c.length, 0);
            return toUint8(chunks, totalLen);
        }

        async function estimateTotalBytes(fileUrls: URL[]) {
            let total = 0;
            await Promise.all(
                fileUrls.map(async (u) => {
                    try {
                        const r = await fetch(u, {method: "HEAD"});
                        const cl = r.headers.get("content-length");
                        if (cl) total += parseInt(cl, 10);
                    } catch {
                        // ignore
                    }
                })
            );
            return total;
        }

        ioquake3({
            websocket: {url: "wss://", subprotocol: "binary"},
            canvas: document.getElementById("canvas") as HTMLCanvasElement,
            arguments: generatedArguments.trim().split(/\s+/),
            locateFile: (path: string) => {
                if (path.endsWith(".wasm")) return wasm;
            },
            preRun: [
                async (module: any) => {
                    module.addRunDependency("setup-ioq3-filesystem");
                    try {
                        const { persist } = await ensureMounts(module);

                        const gameDirs = [com_basegame, fs_basegame, fs_game];
                        const fileEntries = gameDirs.flatMap((g) => config[g].files);
                        const urls = fileEntries.map((f) => new URL(f.src, dataURL));

                        const totalBytes = await estimateTotalBytes(urls);
                        let receivedBytes = 0;

                        for (let i = 0; i < fileEntries.length; i++) {
                            const f = fileEntries[i];
                            const url = urls[i];
                            const name = f.src.split("/").pop() as string;
                            const dstPath = `${f.dst}/${name}`;

                            const exists = (() => {
                                try {
                                    const st = module.FS.stat(dstPath);
                                    return st && st.size > 0;
                                } catch {
                                    return false;
                                }
                            })();
                            setProg((p) => ({...p, current: f.src, total: totalBytes}));

                            if (!exists) {
                                const resp = await fetch(url);
                                if (!resp.ok) continue;
                                const data = await streamToArrayBuffer(resp, (n) => {
                                    receivedBytes += n;
                                    const pct = totalBytes ? Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)) : 0;
                                    setProg({received: receivedBytes, total: totalBytes, pct, current: f.src});
                                });

                                module.FS.mkdirTree(f.dst);
                                module.FS.writeFile(dstPath, data);
                            }
                        }

                        if (persist) {
                            await syncfs(module, false);
                        }
                        setProg((p) => ({...p, pct: 100}));
                    } finally {
                        module.removeRunDependency("setup-ioq3-filesystem");
                    }
                },
            ],
        });
    }, []);

    return (
        <div className="relative w-full h-full">
            <canvas id="canvas" className="w-full h-full"/>
            {prog.pct < 100 && (
                <Card className="absolute bottom-4 left-4 right-4 p-4 bg-background/80 backdrop-blur border border-border">
                    <div className="text-xs text-muted-foreground mb-2 font-mono">
                        {prog.current ? `Downloading: ${prog.current}` : "Preparing downloads"}
                    </div>
                    <Progress value={prog.pct} className="h-2 bg-secondary"/>
                    <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {prog.total
                            ? `${(prog.received / (1024 * 1024)).toFixed(1)} MB / ${(prog.total / (1024 * 1024)).toFixed(1)} MB`
                            : `${prog.pct}%`}
                    </div>
                </Card>
            )}
        </div>
    );
}
