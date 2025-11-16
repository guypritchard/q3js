import {env} from "@/env.ts";
import {getWsProtocol} from "@/lib/utils.ts";

const SERVER_LIST = [
    // FFA
    {
        location: "EU",
        proxy: `${getWsProtocol()}//${env.VITE_PROXY_URL}`,
        host: "ffa.q3js.com",
        port: 80,
    },
]

export default SERVER_LIST;