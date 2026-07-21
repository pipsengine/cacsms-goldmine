"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Gauge,
  History,
  LineChart,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Waves,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ConnectivitySnapshot, ConnectivitySnapshotResponse, ConnectivityStatus } from "@/types/connectivity";
import styles from "./market-data-connection-page.module.css";

type StreamMode = "connecting" | "live" | "reconnecting" | "polling";

type FeedLane = {
  id: string;
  label: string;
  detail: string;
  status: ConnectivityStatus;
  latencyMs: number | null;
  icon: typeof Activity;
};

const statusText: Record<ConnectivityStatus, string> = {
  online: "Online",
  connecting: "Connecting",
  degraded: "Degraded",
  offline: "Offline",
};

const statusIcon = {
  online: CheckCircle2,
  connecting: RefreshCw,
  degraded: AlertTriangle,
  offline: WifiOff,
} satisfies Record<ConnectivityStatus, typeof CheckCircle2>;

export function MarketDataConnectionPage() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const reconnectCount = useRef(0);

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/platform-readiness/connect", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Market data snapshot failed with ${response.status}`);
      const payload = (await response.json()) as ConnectivitySnapshotResponse;
      setSnapshot(payload.snapshot);
      setLastError(null);
      return payload.snapshot;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Market data refresh failed");
      return null;
    }
  }, []);

  useEffect(() => {
    let closed = false;
    const source = new EventSource("/api/platform-readiness/connect/stream");

    const stopFallbackPolling = () => {
      if (fallbackTimer.current) {
        window.clearInterval(fallbackTimer.current);
        fallbackTimer.current = undefined;
      }
    };

    source.addEventListener("open", () => {
      if (closed) return;
      reconnectCount.current = 0;
      stopFallbackPolling();
      setStreamMode("live");
      setLastError(null);
    });

    source.addEventListener("snapshot", (event) => {
      if (closed) return;
      reconnectCount.current = 0;
      stopFallbackPolling();
      setSnapshot(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);
      setStreamMode("live");
      setLastError(null);
    });

    source.addEventListener("error", () => {
      if (closed) return;
      reconnectCount.current += 1;
      setStreamMode(reconnectCount.current > 2 ? "polling" : "reconnecting");
      setLastError("Realtime market stream interrupted; autonomous polling fallback is active.");
      if (!fallbackTimer.current) {
        fallbackTimer.current = window.setInterval(refreshSnapshot, 6000);
      }
    });

    void refreshSnapshot();

    return () => {
      closed = true;
      source.close();
      stopFallbackPolling();
    };
  }, [refreshSnapshot]);

  const marketService = snapshot?.services.find((service) => service.id === "market-feed");
  const brokerService = snapshot?.services.find((service) => service.id === "mt5-bridge");
  const newsService = snapshot?.services.find((service) => service.id === "news-calendar");
  const auditService = snapshot?.services.find((service) => service.id === "audit-stream");
  const databaseService = snapshot?.services.find((service) => service.id === "database");
  const marketData = snapshot?.marketData;

  const lanes = useMemo<FeedLane[]>(
    () => [
      {
        id: "tick-feed",
        label: "Tick Feed",
        detail: "Broker-sourced bid and ask stream with sub-second freshness monitoring.",
        status: marketData?.status ?? "connecting",
        latencyMs: marketService?.latencyMs ?? null,
        icon: RadioTower,
      },
      {
        id: "candle-builder",
        label: "Candle Builder",
        detail: "Short-interval candle aggregation for execution and analysis workflows.",
        status: marketData?.status === "online" ? "online" : marketData?.status ?? "connecting",
        latencyMs: marketService?.latencyMs ? marketService.latencyMs + 4 : null,
        icon: LineChart,
      },
      {
        id: "broker-relay",
        label: "Broker Relay",
        detail: "MT5 bridge handoff that carries prices from terminal runtime to the platform.",
        status: brokerService?.status ?? "connecting",
        latencyMs: brokerService?.latencyMs ?? snapshot?.broker.pingMs ?? null,
        icon: Waves,
      },
      {
        id: "quality-guard",
        label: "Quality Guard",
        detail: "Spread bounds, stale tick detection, and degraded-feed suppression.",
        status: snapshot?.diagnostics.dataQuality ?? "connecting",
        latencyMs: marketService?.latencyMs ?? null,
        icon: ShieldCheck,
      },
      {
        id: "news-overlay",
        label: "News Overlay",
        detail: "USD event timing context used to annotate feed risk and timing windows.",
        status: newsService?.status ?? "connecting",
        latencyMs: newsService?.latencyMs ?? null,
        icon: Sparkles,
      },
      {
        id: "audit-publish",
        label: "Audit Publish",
        detail: "Distribution of market connection evidence to realtime audit and operations views.",
        status: auditService?.status ?? "connecting",
        latencyMs: auditService?.latencyMs ?? null,
        icon: Database,
      },
    ],
    [
      auditService?.latencyMs,
      auditService?.status,
      brokerService?.latencyMs,
      brokerService?.status,
      marketData?.status,
      marketService?.latencyMs,
      newsService?.latencyMs,
      newsService?.status,
      snapshot?.broker.pingMs,
      snapshot?.diagnostics.dataQuality,
    ],
  );

  const readyLanes = lanes.filter((lane) => lane.status === "online").length;
  const lastUpdate = snapshot ? formatTime(snapshot.generatedAt) : "Loading";
  const freshness = formatFreshness(marketData?.lastTickAt);
  const spreadDisplay = formatSpread(marketData?.spread);
  const waveformHeights = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const seed = marketData?.ticksPerMinute ?? 48;
        return 24 + ((seed + index * 9) % 60);
      }),
    [marketData?.ticksPerMinute],
  );
  const sourceRoute =
    brokerService?.status === "online"
      ? "MT5 terminal -> local bridge -> platform feed"
      : brokerService?.status === "degraded"
        ? "Terminal detected -> feed route degraded"
        : "Terminal relay pending";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} />
        <span>Connect</span>
        <ChevronRight size={13} />
        <strong>Market Data Connection</strong>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>03.3</span>
            <div>
              <p>Autonomous price infrastructure</p>
              <h1>Market Data Connection</h1>
            </div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>CONNECT.MARKET</span>
            <span>Mode: Autonomous</span>
            <span>SSE: {streamMode}</span>
            <span>Symbol: {marketData?.symbol ?? "XAUUSD"}</span>
            <span>Audit: audit.platform-readiness.connect.market-data</span>
          </div>
        </div>
        <StatusDecision status={marketData?.status ?? "connecting"} score={snapshot?.readinessScore ?? 0} />
      </header>

      <section className={styles.controlStrip}>
        <div className={styles.pulse}>
          <i />
          <span>
            <small>Feed supervisor</small>
            <strong>{streamMode === "live" ? "Realtime market feed active" : "Reconnect sequence active"}</strong>
          </span>
        </div>
        <div className={styles.stripMetric}>
          <small>Last tick</small>
          <strong>{freshness}</strong>
        </div>
        <div className={styles.stripMetric}>
          <small>Correlation</small>
          <strong>{snapshot?.correlationId ?? "Pending"}</strong>
        </div>
        <button
          className={styles.iconButton}
          type="button"
          onClick={() => void refreshSnapshot()}
          aria-label="Refresh market data connection snapshot"
          title="Refresh market data connection snapshot"
        >
          <RefreshCw size={17} />
        </button>
      </section>

      {lastError ? (
        <div className={styles.notice}>
          <AlertTriangle size={15} />
          <span>{lastError}</span>
        </div>
      ) : null}

      <section className={styles.heroGrid}>
        <article className={styles.heroPanel}>
          <div className={styles.heroTop}>
            <div>
              <small>{marketData?.provider ?? "Market data provider"}</small>
              <h2>{marketData?.symbol ?? "XAUUSD"}</h2>
              <p>{sourceRoute}</p>
            </div>
            <StatusPill status={marketData?.status ?? "connecting"} />
          </div>
          <div className={styles.quoteBoard}>
            <div>
              <span>Bid</span>
              <strong>{formatPrice(marketData?.bid)}</strong>
            </div>
            <div>
              <span>Ask</span>
              <strong>{formatPrice(marketData?.ask)}</strong>
            </div>
            <div>
              <span>Spread</span>
              <strong>{spreadDisplay}</strong>
            </div>
            <div>
              <span>Ticks/min</span>
              <strong>{marketData?.ticksPerMinute ?? 0}</strong>
            </div>
          </div>
          <div className={styles.heroMeta}>
            <span>Freshness {freshness}</span>
            <span>Updated {lastUpdate}</span>
            <span>Endpoint {marketService?.endpoint ?? "Pending"}</span>
          </div>
          <div className={styles.heroWaveform} aria-hidden="true">
            {waveformHeights.map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </article>

        <article className={styles.routePanel}>
          <div className={styles.routeHeader}>
            <h3>Feed Route</h3>
            <span>{snapshot?.readinessScore ?? 0}% readiness</span>
          </div>
          <div className={styles.routeFlow}>
            <RouteNode label="MT5 Terminal" status={brokerService?.status ?? "connecting"} />
            <RouteNode label="Local Bridge" status={brokerService?.status ?? "connecting"} />
            <RouteNode label="Quote Stream" status={marketData?.status ?? "connecting"} />
            <RouteNode label="Audit" status={auditService?.status ?? "connecting"} />
          </div>
          <div className={styles.routeStats}>
            <MetricCard label="Feed latency" value={formatMs(marketService?.latencyMs)} detail="Terminal to UI path" />
            <MetricCard label="Provider" value={marketData?.provider ?? "Pending"} detail="Active quote source" />
            <MetricCard label="Data quality" value={statusText[snapshot?.diagnostics.dataQuality ?? "connecting"]} detail="Shared guardrail state" />
            <MetricCard label="Failover" value={statusText[snapshot?.diagnostics.failover ?? "connecting"]} detail="Backup route posture" />
          </div>
        </article>
      </section>

      <section className={styles.signalStrip} aria-label="Feed signal summary">
        <MetricCard label="Tick rate" value={`${marketData?.ticksPerMinute ?? 0}/min`} detail="Observed one-minute activity" />
        <MetricCard label="Bridge link" value={statusText[brokerService?.status ?? "connecting"]} detail={brokerService?.endpoint ?? "MT5 relay pending"} />
        <MetricCard label="News overlay" value={statusText[newsService?.status ?? "connecting"]} detail="Macro-event context for feed risk" />
        <MetricCard label="Database sync" value={statusText[databaseService?.status ?? "connecting"]} detail="Persistence and audit durability" />
      </section>

      <section className={styles.analysisGrid}>
        <article className={styles.panel}>
          <PanelHeader
            icon={Activity}
            title="Feed Delivery Lanes"
            detail="Tick transport, aggregation, quality controls, contextual overlays, and audit publishing."
          />
          <div className={styles.laneGrid}>
            {lanes.map((lane) => (
              <LaneCard lane={lane} key={lane.id} />
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <PanelHeader
            icon={ShieldCheck}
            title="Freshness and Evidence"
            detail="Provider posture, downstream dependencies, and confidence checks for autonomous consumers."
          />
          <div className={styles.evidenceGrid}>
            <div className={styles.evidenceCard}>
              <h3>Provider Contract</h3>
              <dl>
                <div>
                  <dt>Provider</dt>
                  <dd>{marketData?.provider ?? "Pending"}</dd>
                </div>
                <div>
                  <dt>Symbol</dt>
                  <dd>{marketData?.symbol ?? "XAUUSD"}</dd>
                </div>
                <div>
                  <dt>Endpoint</dt>
                  <dd>{marketService?.endpoint ?? "Not configured"}</dd>
                </div>
                <div>
                  <dt>Bridge assist</dt>
                  <dd>{statusText[brokerService?.status ?? "connecting"]}</dd>
                </div>
                <div>
                  <dt>Audit stream</dt>
                  <dd>{statusText[auditService?.status ?? "connecting"]}</dd>
                </div>
              </dl>
            </div>

            <div className={styles.evidenceCard}>
              <h3>Quality Checks</h3>
              <div className={styles.checkGrid}>
                <CheckChip label="DNS" status={snapshot?.diagnostics.dns ?? "connecting"} />
                <CheckChip label="TLS" status={snapshot?.diagnostics.tls ?? "connecting"} />
                <CheckChip label="Auth" status={snapshot?.diagnostics.auth ?? "connecting"} />
                <CheckChip label="Clock" status={snapshot?.diagnostics.clock ?? "connecting"} />
                <CheckChip label="Data Quality" status={snapshot?.diagnostics.dataQuality ?? "connecting"} />
                <CheckChip label="Failover" status={snapshot?.diagnostics.failover ?? "connecting"} />
              </div>
              <p>
                Feed consumers remain protected when stale ticks, endpoint gaps, or degraded market context are detected by the shared
                connectivity monitor.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.footerGrid}>
        <article className={styles.panel}>
          <PanelHeader compact icon={Clock3} title="Autonomous Actions" detail="Current market loop" />
          <div className={styles.timeline}>
            <div>
              <i />
              <p>Read market connectivity snapshot</p>
              <time>{lastUpdate}</time>
            </div>
            <div>
              <i />
              <p>Validate bid/ask freshness and spread posture</p>
              <time>{freshness}</time>
            </div>
            <div>
              <i />
              <p>Publish feed health evidence to downstream systems</p>
              <time>Live</time>
            </div>
            <div>
              <i />
              <p>Hold autonomous execution when quality checks degrade</p>
              <time>Auto</time>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <PanelHeader compact icon={History} title="Market Logs" detail="Newest events" />
          <div className={styles.logList}>
            {(snapshot?.logs ?? []).map((log) => (
              <div className={styles.logItem} key={log.id}>
                <time>{formatTime(log.timestamp)}</time>
                <strong>{log.source}</strong>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  tone: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={styles.kpi}>
      <span className={`${styles.kpiIcon} ${styles[tone]}`}>
        <Icon size={21} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  detail,
  compact = false,
}: {
  icon: typeof Activity;
  title: string;
  detail: string;
  compact?: boolean;
}) {
  return (
    <header className={compact ? styles.compactHeader : styles.panelHeader}>
      <span>
        <Icon size={compact ? 16 : 19} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </header>
  );
}

function LaneCard({ lane }: { lane: FeedLane }) {
  const Icon = lane.icon;
  return (
    <article className={`${styles.laneCard} ${styles[lane.status]}`}>
      <div className={styles.laneTop}>
        <span>
          <Icon size={18} />
        </span>
        <StatusPill status={lane.status} />
      </div>
      <strong>{lane.label}</strong>
      <p>{lane.detail}</p>
      <small>{formatMs(lane.latencyMs)} latency</small>
    </article>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className={styles.metricCard}>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function RouteNode({ label, status }: { label: string; status: ConnectivityStatus }) {
  return (
    <div className={`${styles.routeNode} ${styles[status]}`}>
      <span>{label}</span>
      <StatusPill status={status} />
    </div>
  );
}

function CheckChip({ label, status }: { label: string; status: ConnectivityStatus }) {
  const Icon = statusIcon[status];
  return (
    <div className={`${styles.checkChip} ${styles[status]}`}>
      <Icon className={status === "connecting" ? styles.spin : undefined} size={13} />
      <span>{label}</span>
    </div>
  );
}

function StatusDecision({ status, score }: { status: ConnectivityStatus; score: number }) {
  const Icon = statusIcon[status];
  return (
    <div className={`${styles.decision} ${styles[status]}`}>
      <small>Feed Decision</small>
      <strong>
        <Icon className={status === "connecting" ? styles.spin : undefined} size={15} />
        {statusText[status]}
      </strong>
      <span>{score}% connectivity readiness</span>
    </div>
  );
}

function StatusPill({ status }: { status: ConnectivityStatus }) {
  const Icon = statusIcon[status];
  return (
    <span className={`${styles.statusPill} ${styles[status]}`}>
      <Icon className={status === "connecting" ? styles.spin : undefined} size={13} />
      {statusText[status]}
    </span>
  );
}

function formatMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value} ms` : "n/a";
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}

function formatSpread(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function formatFreshness(value: string | undefined) {
  if (!value) return "Awaiting ticks";
  const deltaSeconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (deltaSeconds <= 1) return "Just now";
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  return `${Math.round(deltaSeconds / 60)}m ago`;
}
