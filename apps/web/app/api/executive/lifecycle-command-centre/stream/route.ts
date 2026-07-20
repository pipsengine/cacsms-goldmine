import { getControlledLifecycleSnapshot } from "@/lib/server/lifecycle-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try { controller.close(); } catch { /* The client may already have closed the stream. */ }
      };
      const send = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(getControlledLifecycleSnapshot())}\n\n`));
        } catch {
          close();
        }
      };

      send();
      timer = setInterval(send, 15000);
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
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
