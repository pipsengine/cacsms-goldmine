import { getControlledLifecycleSnapshot } from "@/lib/server/lifecycle-snapshot";

export async function GET() {
  return Response.json(await getControlledLifecycleSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
