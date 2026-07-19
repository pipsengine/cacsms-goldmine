export async function GET() {
  return Response.json({ status: "ok", boundary: "opportunities", source: "production-service-placeholder" });
}
