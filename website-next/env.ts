import {createEnv} from "@t3-oss/env-core";
import {z} from "zod";

export const env = createEnv({
    server: {},
    clientPrefix: "NEXT_PUBLIC_",
    client: {
        NEXT_PUBLIC_APP_TITLE: z.string().min(1).optional(),
        NEXT_PUBLIC_MASTER_SERVER_URL: z.string().default("https://master.q3js.com"),
        NEXT_PUBLIC_GAME_URL: z.string().optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
