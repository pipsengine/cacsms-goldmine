import { getConnectivitySnapshot } from "@/lib/server/connectivity-snapshot";
import type { ConnectivitySnapshotResponse } from "@/types/connectivity";

export const dynamic = "force-dynamic";

export async function GET() {
  const response: ConnectivitySnapshotResponse = { snapshot: await getConnectivitySnapshot() };
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
