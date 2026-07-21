import { invalidateMt5LocalBridgeCache } from "@/lib/server/mt5-local-bridge";
import { deleteMt5SessionProfile, setActiveMt5SessionProfile, upsertMt5SessionProfile, listMt5SessionProfiles } from "@/lib/server/mt5-session-store";
import type { Mt5SessionMutationResponse, Mt5SessionProfileCreate, Mt5SessionProfilesResponse } from "@/types/connectivity";

export const dynamic = "force-dynamic";

export async function GET() {
  const response: Mt5SessionProfilesResponse = await listMt5SessionProfiles();
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Mt5SessionProfileCreate;

  if (!body.tenantId?.trim() || !body.userId?.trim() || !body.terminalId?.trim() || !body.label?.trim()) {
    return Response.json({ error: "Tenant ID, user ID, terminal ID, and label are required." }, { status: 400 });
  }

  if (!body.password?.trim()) {
    return Response.json({ error: "Broker password is required." }, { status: 400 });
  }

  if (!body.server?.trim()) {
    return Response.json({ error: "Broker server is required." }, { status: 400 });
  }

  invalidateMt5LocalBridgeCache();
  const response: Mt5SessionMutationResponse = await upsertMt5SessionProfile(body);
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { profileId?: string };

  if (!body.profileId?.trim()) {
    return Response.json({ error: "Profile ID is required." }, { status: 400 });
  }

  invalidateMt5LocalBridgeCache();
  const response: Mt5SessionMutationResponse = await setActiveMt5SessionProfile(body.profileId.trim());
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { profileId?: string };

  if (!body.profileId?.trim()) {
    return Response.json({ error: "Profile ID is required." }, { status: 400 });
  }

  invalidateMt5LocalBridgeCache();
  const response: Mt5SessionMutationResponse = await deleteMt5SessionProfile(body.profileId.trim());
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
