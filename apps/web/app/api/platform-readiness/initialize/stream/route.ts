import { getInitializationSnapshot } from "@/lib/server/initialization-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        try { controller.close(); } catch { /* Client disconnected first. */ }
      };
      const send = async () => {
        if (closed) return;
        try {
          const snapshot = await getInitializationSnapshot();
          if (closed) return;
          controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`));
        } catch {
          close();
          return;
        }
        timer = setTimeout(() => void send(), 5000);
      };
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      void send();
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
