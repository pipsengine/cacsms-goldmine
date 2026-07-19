export async function GET() {
  return Response.json({ status: "ok", boundary: "health", source: "production-service-placeholder" });
}
