"use client";

import useSWR from "swr";
import type { ParsedData } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useData() {
  const { data, error, isLoading } = useSWR<ParsedData>("/api/data", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    refreshInterval: 3600000, // Re-fetch every hour
  });

  return {
    tasks: data?.tasks ?? [],
    meta: data?.meta ?? { weekRange: [], persons: [], customers: [], statuses: [], taskTypes: [] },
    lastUpdated: data?.lastUpdated ?? null,
    source: (data as Record<string, unknown>)?.source as string | undefined ?? undefined,
    isLoading,
    error,
  };
}
