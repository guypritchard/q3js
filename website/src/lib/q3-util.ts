import {getWsProtocol} from "@/lib/utils.ts";
import {env} from "@/env.ts";

export async function q3FetchLines(opts: {
    server: {
        host: string
        proxyPort: number
        targetPort: number
    },
    command: string
    timeoutMs?: number
}): Promise<{ lines: string[]; ping: number }> {
    const {server, command} = opts
    const timeoutMs = opts.timeoutMs ?? 5000

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(
            `${getWsProtocol()}//${env.VITE_PROXY_URL}?host=${server.host}&port=${server.targetPort}`
        )
        ws.binaryType = "arraybuffer"

        const enc = new TextEncoder()
        const dec = new TextDecoder()
        let start = 0

        const timeout = setTimeout(() => {
            try {
                ws.close()
            } catch {
                // ignore
            }
            reject(new Error("timeout"))
        }, timeoutMs)

        ws.addEventListener("open", () => {
            const prefix = new Uint8Array([0xff, 0xff, 0xff, 0xff])
            const payload = enc.encode(command)
            const out = new Uint8Array(prefix.length + payload.length)

            out.set(prefix, 0)
            out.set(payload, prefix.length)

            start = performance.now()
            ws.send(out)
        })

        ws.addEventListener("message", async (ev: MessageEvent) => {
            clearTimeout(timeout)

            const ping = Math.round(performance.now() - start)

            try {
                ws.close()
            } catch {
                // ignore
            }

            const ab =
                ev.data instanceof ArrayBuffer
                    ? ev.data
                    : ev.data instanceof Blob
                        ? await (ev.data as Blob).arrayBuffer()
                        : enc.encode(String(ev.data)).buffer

            const text = dec.decode(ab)
            const lines = text.replace(/\r/g, "").split("\n")

            resolve({lines, ping})
        })

        ws.addEventListener("error", e => {
            clearTimeout(timeout)
            try {
                ws.close()
            } catch {
                // ignore
            }
            reject(e)
        })
    })
}

