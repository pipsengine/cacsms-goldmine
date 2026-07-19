export async function GET() {
  return Response.json({ status: "ok", boundary: "analysis", source: "production-service-placeholder" });
}
