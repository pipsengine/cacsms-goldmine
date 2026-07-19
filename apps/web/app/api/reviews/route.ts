export async function GET() {
  return Response.json({ status: "ok", boundary: "reviews", source: "production-service-placeholder" });
}
