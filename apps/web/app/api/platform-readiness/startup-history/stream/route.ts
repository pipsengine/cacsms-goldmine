import { getStartupHistorySnapshot } from "@/lib/server/startup-history";

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
        try { controller.close(); } catch { /* Client already disconnected. */ }
      };
      const send = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(getStartupHistorySnapshot())}\n\n`));
        timer = setTimeout(send, 5000);
      };

      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      send();
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
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
