import {createEnv} from "@t3-oss/env-core";
import {z} from "zod";

export const env = createEnv({
    server: {},
    clientPrefix: "NEXT_PUBLIC_",
    client: {
        NEXT_PUBLIC_APP_TITLE: z.string().min(1).optional(),
        NEXT_PUBLIC_MASTER_SERVER_URL: z.string().default("https://master.q3js.com"),
        NEXT_PUBLIC_INSECURE_GAME_PAGE_BASE_URL: z.string().min(1).default("http://play2.q3js.com"),
        NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().default("G-X7L740SND7"),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
