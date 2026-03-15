import {ServerInfoResponse, ServerResponse} from "@/lib/client";

export type ServerWithInfo = ServerResponse & {
    info: ServerInfoResponse | null;
};
