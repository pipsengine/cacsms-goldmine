import { getMt5LocalBridgeSnapshot } from "@/lib/server/mt5-local-bridge";
import { listMt5SessionProfiles } from "@/lib/server/mt5-session-store";
import { getMt5TerminalCatalog } from "@/lib/server/mt5-terminal-catalog";
import type { ConnectivityDebugResponse } from "@/types/connectivity";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sessions, terminals, mt5] = await Promise.all([
    listMt5SessionProfiles(),
    getMt5TerminalCatalog(),
    getMt5LocalBridgeSnapshot(),
  ]);

  const response: ConnectivityDebugResponse = {
    mt5,
    sessions: sessions.profiles,
    activeSessionId: sessions.activeSessionId,
    storageMode: sessions.storageMode,
    terminals,
  };

  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
