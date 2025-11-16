import {env} from "@/env.ts";
import {getWsProtocol} from "@/lib/utils.ts";

const SERVER_LIST = [
    // FFA
    {
        location: "EU",
        proxy: `${getWsProtocol()}//${env.VITE_PROXY_URL}`,
        host: "88.99.66.204",
        port: 27960,
    },
]

export default SERVER_LIST;