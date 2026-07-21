import { getStartupHistorySnapshot } from "@/lib/server/startup-history";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getStartupHistorySnapshot(), { headers: { "Cache-Control": "no-store" } });
}
