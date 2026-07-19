import type { LifecycleSnapshot } from "@/types/lifecycle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchLifecycleSnapshot(signal?: AbortSignal): Promise<LifecycleSnapshot> {
  const response = await fetch(`${API_BASE}/api/executive/lifecycle-command-centre`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Lifecycle snapshot failed with ${response.status}`);
  }

  return response.json();
}

export function openLifecycleStream(): EventSource | null {
  if (typeof window === "undefined") return null;
  return new EventSource(`${API_BASE}/api/executive/lifecycle-command-centre/stream`);
}
