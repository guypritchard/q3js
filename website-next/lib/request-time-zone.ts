import {cookies} from "next/headers";
import {DEFAULT_TIME_ZONE, TIME_ZONE_COOKIE_NAME} from "@/lib/time-zone";

export async function getRequestTimeZone() {
    const cookieStore = await cookies();
    return cookieStore.get(TIME_ZONE_COOKIE_NAME)?.value ?? DEFAULT_TIME_ZONE;
}
