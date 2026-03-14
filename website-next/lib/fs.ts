export type LoadStage = "initializing" | "downloading" | "launching" | "ready";

export type Prog = {
    received: number;
    total: number;
    pct: number;
    current?: string;
    stage: LoadStage;
    etaSeconds?: number;
};

// Persistent data versioning
const DATA_VERSION = "v1.2";
const VERSION_FILE = "/baseq3/.ioq3-data-version";

type FSLike = {
    syncfs: (populate: boolean, callback: (err: unknown) => void) => void;
    filesystems?: {
        IDBFS?: unknown;
    };
    mkdirTree: (path: string) => void;
    mount: (type: unknown, opts: Record<string, unknown>, mountpoint: string) => void;
    readdir: (path: string) => string[];
    stat: (path: string) => { mode: number; size?: number };
    rmdir: (path: string) => void;
    unlink: (path: string) => void;
    readFile: (path: string, opts: { encoding: "utf8" }) => string;
    writeFile: (path: string, data: string | ArrayBuffer | ArrayBufferView) => void;
};

export type IOQ3Module = {
    FS: FSLike;
    IDBFS?: unknown;
};

// Sync helper
export function syncfs(module: IOQ3Module, populate: boolean) {
    return new Promise<void>((resolve, reject) => {
        try {
            module.FS.syncfs(populate, (err: unknown) => (err ? reject(err) : resolve()));
        } catch (e) {
            reject(e);
        }
    });
}

// Resolve IDBFS across different Emscripten variants
export function resolveIDBFS(module: Partial<IOQ3Module> | null | undefined) {
    if (module?.FS?.filesystems?.IDBFS) return module.FS.filesystems.IDBFS;
    if (module?.IDBFS) return module.IDBFS;
    const globalIDBFS = (globalThis as typeof globalThis & { IDBFS?: unknown }).IDBFS;
    if (globalIDBFS) return globalIDBFS;
    return null;
}

function isDirectoryMode(mode: number) {
    return (mode & 0o170000) === 0o040000;
}

function clearDirectory(FS: FSLike, dirPath: string) {
    for (const entry of FS.readdir(dirPath)) {
        if (entry === "." || entry === "..") continue;
        const entryPath = `${dirPath}/${entry}`;
        const stat = FS.stat(entryPath);
        if (isDirectoryMode(stat.mode)) {
            clearDirectory(FS, entryPath);
            FS.rmdir(entryPath);
            continue;
        }
        FS.unlink(entryPath);
    }
}

function readDataVersion(FS: FSLike): string | null {
    try {
        return FS.readFile(VERSION_FILE, {encoding: "utf8"}).trim();
    } catch {
        return null;
    }
}

function normalizeMountDirs(gameDirs: string[]) {
    return Array.from(
        new Set(
            gameDirs
                .map((dir) => dir.trim())
                .filter(Boolean)
        )
    );
}

export async function ensureMounts(module: IOQ3Module, gameDirs: string[] = ["baseq3"]): Promise<{ persist: boolean }> {
    const {FS} = module;
    const mountDirs = normalizeMountDirs(["baseq3", ...gameDirs]);
    for (const dir of mountDirs) {
        FS.mkdirTree(`/${dir}`);
    }
    FS.mkdirTree("/baseq3/vm");

    const IDBFS = resolveIDBFS(module);
    if (!IDBFS) {
        console.warn("[ioq3] IDBFS not linked. Running without persistence.");
        return {persist: false};
    }

    for (const dir of mountDirs) {
        try {
            FS.mount(IDBFS, {autoPersist: true}, `/${dir}`);
        } catch {
            // already mounted
        }
    }

    await syncfs(module, true);
    const current = readDataVersion(FS);
    if (current === null) {
        try {
            FS.writeFile(VERSION_FILE, DATA_VERSION);
            await syncfs(module, false);
        } catch (e) {
            console.warn("[ioq3] Version migration failed:", e);
        }
    } else if (current !== DATA_VERSION) {
        try {
            for (const dir of mountDirs) {
                clearDirectory(FS, `/${dir}`);
            }
            FS.writeFile(VERSION_FILE, DATA_VERSION);
            await syncfs(module, false);
        } catch (e) {
            console.warn("[ioq3] Version reset failed:", e);
        }
    }

    return {persist: true};
}

// rAF-throttled progress updater
export function makeRafUpdater(setter: (p: Prog) => void) {
    let scheduled = false;
    let last: Prog | null = null;
    return (v: Prog) => {
        last = v;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            if (last) setter(last);
            scheduled = false;
        });
    };
}

// Fetch into a single preallocated Uint8Array using Content-Length
export async function fetchIntoUint8(url: URL, onChunk: (n: number) => void) {
    // HEAD for length
    let expected: number | undefined;
    try {
        const h = await fetch(url, {method: "HEAD"});
        const cl = h.headers.get("content-length");
        if (cl) expected = parseInt(cl, 10);
    } catch {
        // ignore
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);

    if (expected && resp.body) {
        const out = new Uint8Array(expected);
        const reader = resp.body.getReader();
        let off = 0;
        for (; ;) {
            const {done, value} = await reader.read();
            if (done) break;
            out.set(value!, off);
            off += value!.length;
            onChunk(value!.length);
        }
        return off === expected ? out : out.subarray(0, off);
    }

    // Fallback: single allocation
    const buf = new Uint8Array(await resp.arrayBuffer());
    onChunk(buf.byteLength);
    return buf;
}

export async function estimateTotalBytes(fileUrls: URL[]) {
    let total = 0;
    await Promise.all(
        fileUrls.map(async (u) => {
            try {
                const r = await fetch(u, {method: "HEAD"});
                const cl = r.headers.get("content-length");
                if (cl) total += parseInt(cl, 10);
            } catch {
            }
        })
    );
    return total;
}
