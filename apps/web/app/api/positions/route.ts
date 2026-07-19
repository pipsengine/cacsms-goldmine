export async function GET() {
  return Response.json({ status: "ok", boundary: "positions", source: "production-service-placeholder" });
}
