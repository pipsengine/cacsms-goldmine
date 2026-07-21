import { getConnectivitySnapshot } from "@/lib/server/connectivity-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let reconnectAttempt = 0;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* Client closed the stream first. */
        }
      };

      const send = async () => {
        if (closed) return;
        try {
          const snapshot = await getConnectivitySnapshot(reconnectAttempt);
          controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`));
          reconnectAttempt += 1;
        } catch {
          close();
        }
      };

      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      void send();
      timer = setInterval(() => {
        void send();
      }, 5000);
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
