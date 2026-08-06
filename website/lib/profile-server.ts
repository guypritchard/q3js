import "server-only";

import { cache } from "react";
import { getProfile, getProfileDistribution } from "@/lib/api/generated/sdk.gen";
import type { KillDistributionPointResponse, ProfileResponse } from "@/lib/api/generated/types.gen";
import { serverApiClient } from "@/lib/api/server-client";

export const fetchProfile = cache(async (
  playerName: string,
): Promise<ProfileResponse | undefined> => {
  const result = await getProfile({
    client: serverApiClient,
    path: { playerName },
    cache: "no-store",
    throwOnError: false,
  });

  if (result.response?.status === 404) {
    return undefined;
  }
  if (!result.data) {
    throw new Error(`Unable to load player profile (${result.response?.status ?? "network error"}).`);
  }
  return result.data;
});

export const fetchProfileDistribution = cache(async (
  playerName: string,
  period: string,
  timeZone: string,
): Promise<KillDistributionPointResponse[]> => {
  const result = await getProfileDistribution({
    client: serverApiClient,
    path: { playerName },
    query: { period, timeZone },
    cache: "no-store",
    throwOnError: false,
  });

  if (!result.data) {
    throw new Error(`Unable to load player frag activity (${result.response?.status ?? "network error"}).`);
  }
  return result.data;
});
