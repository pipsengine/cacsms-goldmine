import { getControlledLifecycleSnapshot } from "@/lib/server/lifecycle-snapshot";

export async function GET() {
  return Response.json(getControlledLifecycleSnapshot());
}
