export async function GET() {
  return Response.json({ status: "ok", boundary: "execution", source: "production-service-placeholder" });
}
