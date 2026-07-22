import { detectMt5TerminalCandidates, invalidateMt5LocalBridgeCache } from "@/lib/server/mt5-local-bridge";
import { deleteMt5SessionProfile, setActiveMt5SessionProfile, upsertMt5SessionProfile, listMt5SessionProfiles } from "@/lib/server/mt5-session-store";
import { invalidateMt5TerminalCatalog } from "@/lib/server/mt5-terminal-catalog";
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

  if (body.login?.trim() && !/^\d+$/.test(body.login.trim())) {
    return Response.json(
      { error: "MT5 account login must be a numeric trading account ID, not an email address or application username." },
      { status: 400 },
    );
  }

  const requestedLogin = body.login?.trim() ?? "";
  const detectedTerminalPaths = detectMt5TerminalCandidates();
  const terminalDetected = detectedTerminalPaths.some((terminalPath) => terminalPath === body.terminalPath);
  if (!terminalDetected) {
    return Response.json({ error: "Selected broker terminal was not detected on this machine." }, { status: 400 });
  }

  if (!requestedLogin) {
    return Response.json(
      { error: "Select a numeric MT5 trading account ID for the selected broker terminal." },
      { status: 400 },
    );
  }

  const response: Mt5SessionMutationResponse = await upsertMt5SessionProfile(body);
  invalidateMt5LocalBridgeCache();
  invalidateMt5TerminalCatalog();
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { profileId?: string };

  if (!body.profileId?.trim()) {
    return Response.json({ error: "Profile ID is required." }, { status: 400 });
  }

  const response: Mt5SessionMutationResponse = await setActiveMt5SessionProfile(body.profileId.trim());
  invalidateMt5LocalBridgeCache();
  invalidateMt5TerminalCatalog();
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { profileId?: string };

  if (!body.profileId?.trim()) {
    return Response.json({ error: "Profile ID is required." }, { status: 400 });
  }

  const response: Mt5SessionMutationResponse = await deleteMt5SessionProfile(body.profileId.trim());
  invalidateMt5LocalBridgeCache();
  invalidateMt5TerminalCatalog();
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
