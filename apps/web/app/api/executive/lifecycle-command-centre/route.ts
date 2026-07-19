import { lifecycleSnapshot } from "@/features/executive/lifecycle-command-centre-data";

export async function GET() {
  return Response.json({
    ...lifecycleSnapshot,
    updatedAt: new Date().toISOString(),
  });
}
