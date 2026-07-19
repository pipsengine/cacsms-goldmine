"use client";

import { Menu, Power, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Tick = {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: string | null;
  source: "mt5" | "market-data" | "placeholder";
};

const lagosTimeZone = "Africa/Lagos";
const defaultTick: Tick = {
  symbol: "XAUUSD",
  bid: 2425.36,
  ask: 2425.52,
  spread: 1.6,
  timestamp: null,
  source: "placeholder",
};

const initialSession = { label: "Syncing", detail: "Nigeria time", open: true };

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const [systemRunning, setSystemRunning] = useState(true);
  const [tick, setTick] = useState<Tick>(defaultTick);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const loadTick = async () => {
      try {
        const response = await fetch("/api/market-data/tick", { cache: "no-store" });
        if (!response.ok) return;
        const nextTick = (await response.json()) as Tick;
        if (active) setTick(nextTick);
      } catch {
        if (active) {
          setTick((current) => ({
            ...current,
            timestamp: new Date().toISOString(),
            source: "placeholder",
          }));
        }
      }
    };

    void loadTick();
    const timer = window.setInterval(loadTick, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const formattedDate = useMemo(
    () =>
      now
        ? new Intl.DateTimeFormat("en-NG", {
            timeZone: lagosTimeZone,
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(now)
        : "--",
    [now],
  );

  const formattedTime = useMemo(
    () =>
      now
        ? new Intl.DateTimeFormat("en-NG", {
            timeZone: lagosTimeZone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }).format(now)
        : "--",
    [now],
  );

  const session = useMemo(() => (now ? getMarketSession(now) : initialSession), [now]);
  const tickAge = tick.timestamp ? `${Math.max(0, Math.round((Date.now() - new Date(tick.timestamp).getTime()) / 1000))}s` : "--";

  return (
    <header className="topbar" aria-label="System status topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-only" onClick={onOpenNavigation} aria-label="Open navigation">
          <Menu size={18} />
        </button>
        <StatusTile label="Date" value={formattedDate} />
        <StatusTile label="Time" value={formattedTime} subValue="Nigeria" />
        <StatusTile label="Market Session" value={session.label} tone={session.open ? "success" : "warning"} subValue={session.detail} />
      </div>

      <div className="topbar-right">
        <div className="tick-tile" aria-live="polite">
          <span>Tick</span>
          <strong>{tick.symbol} {tick.bid.toFixed(2)} / {tick.ask.toFixed(2)}</strong>
          <small>Spread {tick.spread.toFixed(1)} | {tick.source} | {tickAge}</small>
        </div>
        <button
          className={`system-toggle ${systemRunning ? "running" : "stopped"}`}
          onClick={() => setSystemRunning((value) => !value)}
          aria-pressed={systemRunning}
        >
          <Power size={16} />
          {systemRunning ? "Stop" : "Start"}
        </button>
        <div className="user-profile" role="button" tabIndex={0} aria-label="User profile">
          <UserCircle size={28} />
          <span>
            <strong>Alex Ogbaisi</strong>
            <small>Super Administrator</small>
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusTile({ label, value, subValue, tone }: { label: string; value: string; subValue?: string; tone?: "success" | "warning" }) {
  return (
    <div className={`system-status-tile ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {subValue ? <small>{subValue}</small> : null}
    </div>
  );
}

function getMarketSession(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: lagosTimeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const minutes = hour * 60 + minute;

  if (weekday === "Sat" || weekday === "Sun") {
    return { label: "Market Closed", detail: "Weekend", open: false };
  }

  if (minutes >= 13 * 60 && minutes < 17 * 60) return { label: "London-New York Overlap", detail: "High liquidity", open: true };
  if (minutes >= 8 * 60 && minutes < 17 * 60) return { label: "London Session", detail: "Open", open: true };
  if (minutes >= 13 * 60 && minutes < 22 * 60) return { label: "New York Session", detail: "Open", open: true };
  if (minutes >= 0 && minutes < 9 * 60) return { label: "Asian Session", detail: "Open", open: true };
  return { label: "Between Sessions", detail: "Low liquidity", open: true };
}
