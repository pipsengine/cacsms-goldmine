export const dynamic = "force-dynamic";

import { getMt5LocalBridgeSnapshot } from "@/lib/server/mt5-local-bridge";

let lastPrice = 2425.36;

export async function GET() {
  const localMt5 = await getMt5LocalBridgeSnapshot();

  if (localMt5?.ok && typeof localMt5.bid === "number" && typeof localMt5.ask === "number") {
    return Response.json({
      symbol: localMt5.symbol,
      bid: localMt5.bid,
      ask: localMt5.ask,
      spread: typeof localMt5.spread === "number" ? round(localMt5.spread, 1) : round(localMt5.ask - localMt5.bid, 1),
      timestamp: localMt5.lastTickAt,
      source: "mt5" as const,
    });
  }

  const movement = (Math.random() - 0.48) * 0.28;
  lastPrice = Math.max(1800, lastPrice + movement);
  const spread = 1.4 + Math.random() * 0.6;
  const bid = lastPrice;
  const ask = lastPrice + spread / 10;

  return Response.json({
    symbol: "XAUUSD",
    bid: round(bid),
    ask: round(ask),
    spread: round(spread, 1),
    timestamp: new Date().toISOString(),
    source: "placeholder",
  });
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
