import { queryOptions } from "@tanstack/react-query";
import {
  getStatsOptions,
  statusOptions,
} from "@/lib/api/generated/@tanstack/react-query.gen";
import { client } from "@/lib/api/client";
import { fetchListedServers } from "@/lib/listed-servers";

export function masterServerQueryOptions() {
  return queryOptions({
    queryKey: ["listed-servers"],
    queryFn: ({ signal }) => fetchListedServers(signal),
    refetchInterval: 5_000,
  });
}

export function masterStatusQueryOptions() {
  return queryOptions({
    ...statusOptions({ client }),
    refetchInterval: 5_000,
  });
}

export function masterStatsQueryOptions() {
  return queryOptions({
    ...getStatsOptions({ client }),
    refetchInterval: 5_000,
  });
}
