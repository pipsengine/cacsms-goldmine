export async function GET() {
  return Response.json({ status: "ok", boundary: "risk", source: "production-service-placeholder" });
}
