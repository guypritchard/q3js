import {useEffect} from "react";
// @ts-ignore
import ioquake3 from "@/lib/ioquake3.js"
import wasm from "@/lib/ioquake3.wasm?url";

const config = {
    "baseq3": {
        "_comment": "Copy baseq3/vm/*.qvm to baseq3/vm/ as the Quake 3 demo QVMs are not compatible. However the botfiles are not fully compatible with newer QVMs.",
        "files": [
            {"src": "baseq3/pak0.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak1.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak2.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak3.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak4.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak5.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak6.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak7.pk3", "dst": "/baseq3"},
            {"src": "baseq3/pak8.pk3", "dst": "/baseq3"},
            {"src": "baseq3/vm/cgame.qvm", "dst": "/baseq3/vm"},
            {"src": "baseq3/vm/qagame.qvm", "dst": "/baseq3/vm"},
            {"src": "baseq3/vm/ui.qvm", "dst": "/baseq3/vm"}
        ]
    },
} as const;


export default function GamePage() {
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

        generatedArguments += ` +connect 88.99.66.204:27961`;

        const queryArgs = urlParams.get('args');
        if (queryArgs) generatedArguments += ` ${queryArgs} `;

        const dataURL = new URL(location.origin + location.pathname);

        ioquake3({
            websocket: {
                url: "wss://",
            },

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
