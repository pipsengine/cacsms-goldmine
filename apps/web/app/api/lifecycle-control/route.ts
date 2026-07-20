import { commandLifecycle, getLifecycleRuntime } from "@/lib/server/lifecycle-control";
import type { LifecycleCommandRequest, LifecycleControlResponse } from "@/types/lifecycle-control";

export const dynamic = "force-dynamic";

export async function GET() {
  const response: LifecycleControlResponse = { runtime: getLifecycleRuntime() };
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as LifecycleCommandRequest;
    if (body?.command !== "START" && body?.command !== "STOP") {
      return Response.json({ error: "Command must be START or STOP." }, { status: 400 });
    }
    const response: LifecycleControlResponse = { runtime: commandLifecycle(body.command) };
    return Response.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid lifecycle command payload." }, { status: 400 });
  }
}
