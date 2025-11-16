import {useEffect} from "react";
// @ts-ignore
import ioquake3 from "@/lib/ioquake3.js"
import wasm from "@/lib/ioquake3.wasm?url";

const config = {
    "demoq3": {
        "_comment": "Copy baseq3/vm/*.qvm to demoq3/vm/ as the Quake 3 demo QVMs are not compatible. However the botfiles are not fully compatible with newer QVMs.",
        "files": [
            {"src": "demoq3/pak0.pk3", "dst": "/demoq3"},
            {"src": "demoq3/vm/cgame.qvm", "dst": "/demoq3/vm"},
            {"src": "demoq3/vm/qagame.qvm", "dst": "/demoq3/vm"},
            {"src": "demoq3/vm/ui.qvm", "dst": "/demoq3/vm"}
        ]
    },
} as const;


export default function GamePage() {
    useEffect(() => {

        const urlParams = new URLSearchParams(window.location.search);
        const com_basegame = "demoq3" as const;
        const fs_basegame = "demoq3" as const;
        const fs_game = "demoq3" as const;
        let generatedArguments = `
                +set sv_pure 0
                +set net_enabled 0
                +set r_mode -2
                +set com_basegame "${com_basegame}"
                +set fs_basegame "${fs_basegame}"
                +set fs_game "${fs_game}"
            `;

        const queryArgs = urlParams.get('args');
        if (queryArgs) generatedArguments += ` ${queryArgs} `;

        const dataURL = new URL(location.origin + location.pathname);

        ioquake3({
            canvas: document.getElementById('canvas') as HTMLCanvasElement,
            arguments: generatedArguments.trim().split(/\s+/),
            locateFile: (path: string) => {
                if (path.endsWith('.wasm')) {
                    return wasm;
                }
            },
            preRun: [async (module: any) => {
                module.addRunDependency('setup-ioq3-filesystem');
                try {
                    const gameDirs = [com_basegame, fs_basegame, fs_game];
                    for (let g = 0; g < gameDirs.length; g++) {
                        const gamedir = gameDirs[g];
                        if (config[gamedir] === null || config[gamedir].files === null) {
                            console.warn(`Game directory ${gamedir} not found in config.json, skipping.`);
                            continue;
                        }
                        const files = config[gamedir].files;
                        const fetches = files.map(file => fetch(new URL(file.src, dataURL)));
                        for (let i = 0; i < files.length; i++) {
                            const response = await fetches[i];
                            if (!response.ok) continue;
                            const data = await response.arrayBuffer();
                            let name = files[i].src.split('/').pop() as string;
                            let dir = files[i].dst;
                            module.FS.mkdirTree(dir);
                            module.FS.writeFile(`${dir}/${name}`, new Uint8Array(data));
                        }
                    }
                } finally {
                    module.removeRunDependency('setup-ioq3-filesystem');
                }
            }],
        });

    }, []);


    return <canvas id="canvas"/>

}
