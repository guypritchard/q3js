// @ts-ignore
import ioquake3 from "@/lib/ioquake3.js";
import wasm from "@/lib/ioquake3.wasm?url"
import {getWsProtocol} from "@/lib/utils.ts";
import {ensureMounts, estimateTotalBytes, fetchIntoUint8, type Prog, syncfs} from "@/lib/fs.ts";

type Params = {
    host: string;
    proxyPort: number;
    name: string;
    rafUpdate: (prog: Prog) => void;
}


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

export default function startGame({host, proxyPort, name, rafUpdate}: Params) {
    const com_basegame = "baseq3" as const;
    const fs_basegame = "baseq3" as const;
    const fs_game = "baseq3" as const;
    const sanitizedName = name.replace(/"/g, "'").trim() || "Q3JS Player";
    const engineArguments = [
        "+set", "sv_pure", "0",
        "+set", "net_enabled", "1",
        "+set", "r_mode", "-2",
        "+set", "com_basegame", com_basegame,
        "+set", "fs_basegame", fs_basegame,
        "+set", "cl_allowDownload", "1",
        "+set", "con_scale", "2",
        "+set", "fs_game", fs_game,
        "+connect", `${host}:${proxyPort}`,
        "+set", "name", sanitizedName
    ];

    if (sanitizedName === "^1L^2K") {
        engineArguments.push("+set", "cg_autoswitch", "0", "+bind", "3", "weapon 7", "+bind", "e", "+zoom");
    }

    const dataURL = new URL(location.origin + location.pathname);

    ioquake3({
        websocket: {
            url: `${getWsProtocol()}//${host}:${proxyPort}`,
            subprotocol: "binary"
        },
        canvas: document.getElementById("canvas") as HTMLCanvasElement,
        arguments: engineArguments,
        onRuntimeInitialized: () => {
            rafUpdate({received: 0, total: 0, pct: 100, current: "ready", stage: "ready"});
        },
        locateFile: (path: string) => {
            if (path.endsWith(".wasm")) return wasm;
        },
        preRun: [
            async (module: any) => {
                module.addRunDependency("setup-ioq3-filesystem");
                try {
                    rafUpdate({
                        received: 0,
                        total: 0,
                        pct: 0,
                        current: "Preparing local storage",
                        stage: "initializing"
                    });
                    const {persist} = await ensureMounts(module);

                    const gameDirs = [com_basegame, fs_basegame, fs_game];
                    const fileEntries = gameDirs.flatMap((g) => (config as any)[g].files);
                    const urls = fileEntries.map((f: { src: string }) => new URL(f.src, dataURL));

                    const totalBytes = await estimateTotalBytes(urls);
                    let receivedBytes = 0;
                    const downloadStart = Date.now();

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

                        rafUpdate({
                            received: receivedBytes,
                            total: totalBytes,
                            pct: totalBytes ? Math.floor((receivedBytes / totalBytes) * 100) : 0,
                            current: f.src,
                            stage: "downloading"
                        });

                        if (!exists) {
                            const data = await fetchIntoUint8(url, (n) => {
                                receivedBytes += n;
                                const pct = totalBytes ? Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)) : 0;
                                const elapsedSeconds = Math.max((Date.now() - downloadStart) / 1000, 0.001);
                                const bytesPerSecond = receivedBytes / elapsedSeconds;
                                const remainingBytes = Math.max(totalBytes - receivedBytes, 0);
                                const etaSeconds = bytesPerSecond > 0 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
                                rafUpdate({
                                    received: receivedBytes,
                                    total: totalBytes,
                                    pct,
                                    current: f.src,
                                    stage: "downloading",
                                    etaSeconds
                                });
                            });

                            module.FS.mkdirTree(f.dst);
                            module.FS.writeFile(dstPath, data);
                        }
                    }

                    if (persist) {
                        await syncfs(module, false);
                    }
                    rafUpdate({
                        received: totalBytes,
                        total: totalBytes,
                        pct: 100,
                        current: "Launching engine",
                        stage: "launching"
                    });
                } finally {
                    module.removeRunDependency("setup-ioq3-filesystem");
                }
            },
        ],
    });
}
