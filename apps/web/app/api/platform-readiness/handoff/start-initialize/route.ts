import { createStartInitializeHandoff, getStartInitializeHandoff } from "@/lib/server/start-initialize-handoff";
import type { StartAssessmentRequest, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";

export const dynamic = "force-dynamic";

export async function GET() {
  const handoff = getStartInitializeHandoff();
  const response: StartInitializeHandoffResponse = { status: handoff ? "available" : "absent", handoff };
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const assessment = await request.json() as StartAssessmentRequest;
    if (!Number.isFinite(assessment?.cycleNumber) || !Array.isArray(assessment?.checks)) {
      return Response.json({ error: "Invalid START assessment payload." }, { status: 400 });
    }
    const internalToken = process.env.PLATFORM_READINESS_INTERNAL_HANDOFF_TOKEN;
    const trustedAdapter = Boolean(internalToken && request.headers.get("x-platform-readiness-attestation") === internalToken);
    const attestedAssessment: StartAssessmentRequest = trustedAdapter ? assessment : {
      ...assessment,
      checks: assessment.checks.map((check) => ({ ...check, evidenceSource: "unavailable" })),
    };
    const handoff = createStartInitializeHandoff(attestedAssessment);
    const response: StartInitializeHandoffResponse = { status: "available", handoff };
    return Response.json(response, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to publish START handoff." }, { status: 400 });
  }
}
