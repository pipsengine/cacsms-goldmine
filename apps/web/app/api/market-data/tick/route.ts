export const dynamic = "force-dynamic";

let lastPrice = 2425.36;

export async function GET() {
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
