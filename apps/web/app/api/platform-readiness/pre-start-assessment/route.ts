import { assessPreStartReadiness } from "@/lib/server/pre-start-assessment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    return Response.json(await assessPreStartReadiness(force), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Pre-start assessment failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
