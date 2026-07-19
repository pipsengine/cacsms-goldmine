import { lifecycleSnapshot } from "@/features/executive/lifecycle-command-centre-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ ...lifecycleSnapshot, updatedAt: new Date().toISOString() })}\n\n`),
        );
      };

      send();
      const timer = setInterval(send, 15000);

      return () => clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
