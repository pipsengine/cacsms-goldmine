import { getInitializationSnapshot } from "@/lib/server/initialization-snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getInitializationSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
