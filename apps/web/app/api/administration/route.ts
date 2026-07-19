export async function GET() {
  return Response.json({ status: "ok", boundary: "administration", source: "production-service-placeholder" });
}
