"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CloudCog,
  Database,
  LineChart,
  Network,
  PlugZap,
  RefreshCw,
  Router,
  SatelliteDish,
  Server,
  ShieldCheck,
  TerminalSquare,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectivitySnapshot, ConnectivitySnapshotResponse, ConnectivityStatus } from "@/types/connectivity";
import styles from "./connect-page.module.css";

type StreamState = "connecting" | "live" | "reconnecting" | "fallback";

const statusLabel: Record<ConnectivityStatus, string> = {
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

export function ConnectPage() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot | null>(null);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const [websocketState, setWebsocketState] = useState<ConnectivityStatus | null>(null);
  const reconnects = useRef(0);
  const websocketRetry = useRef<number | undefined>(undefined);

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/platform-readiness/connect", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Connectivity API returned ${response.status}`);
      const payload = await response.json() as ConnectivitySnapshotResponse;
      setSnapshot(payload.snapshot);
      setLastError(null);
      return payload.snapshot;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Connectivity refresh failed");
      return null;
    }
  }, []);

  useEffect(() => {
    let closed = false;
    let fallbackTimer: number | undefined;
    const source = new EventSource("/api/platform-readiness/connect/stream");

    const stopFallbackPolling = () => {
      if (fallbackTimer) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    source.addEventListener("open", () => {
      if (closed) return;
      reconnects.current = 0;
      stopFallbackPolling();
      setStreamState("live");
      setLastError(null);
    });

    source.addEventListener("snapshot", (event) => {
      if (closed) return;
      reconnects.current = 0;
      stopFallbackPolling();
      setSnapshot(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);
      setStreamState("live");
      setLastError(null);
    });

    source.addEventListener("error", () => {
      if (closed) return;
      reconnects.current += 1;
      setStreamState(reconnects.current > 2 ? "fallback" : "reconnecting");
      setLastError("Realtime stream interrupted; autonomous polling fallback is active.");
      if (!fallbackTimer) {
        fallbackTimer = window.setInterval(refreshSnapshot, 7000);
      }
    });

    void refreshSnapshot();

    return () => {
      closed = true;
      source.close();
      stopFallbackPolling();
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    if (!snapshot?.websocketEndpoint) {
      setWebsocketState(null);
      return;
    }
    const websocketEndpoint = snapshot.websocketEndpoint;

    let socket: WebSocket | undefined;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        setWebsocketState("connecting");
        socket = new WebSocket(websocketEndpoint);
        socket.onopen = () => setWebsocketState("online");
        socket.onmessage = () => setWebsocketState("online");
        socket.onerror = () => setWebsocketState("degraded");
        socket.onclose = () => {
          if (closed) return;
          setWebsocketState("degraded");
          websocketRetry.current = window.setTimeout(connect, 5000);
        };
      } catch {
        setWebsocketState("degraded");
        websocketRetry.current = window.setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      closed = true;
      socket?.close();
      if (websocketRetry.current) window.clearTimeout(websocketRetry.current);
    };
  }, [snapshot?.websocketEndpoint]);

  const totals = useMemo(() => {
    const services = snapshot?.services ?? [];
    return {
      online: services.filter((item) => item.status === "online").length,
      degraded: services.filter((item) => item.status === "degraded").length,
      offline: services.filter((item) => item.status === "offline").length,
      total: services.length,
    };
  }, [snapshot?.services]);

  const generatedAt = snapshot ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(snapshot.generatedAt)) : "Loading";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} />
        <strong>Connect</strong>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>03</span>
            <div>
              <p>Autonomous lifecycle stage</p>
              <h1>Connect</h1>
            </div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>CONNECT</span>
            <span>Mode: Fully autonomous</span>
            <span>SSE: {streamState}</span>
            <span>WebSocket: {snapshot?.websocketEndpoint ? statusLabel[websocketState ?? "connecting"] : "Not configured"}</span>
            <span>Audit: audit.platform-readiness.connect</span>
          </div>
        </div>
        <div className={`${styles.decision} ${snapshot ? styles[snapshot.overallStatus] : styles.connecting}`}>
          <small>Connection Decision</small>
          <strong>{snapshot ? statusLabel[snapshot.overallStatus] : "Connecting"}</strong>
          <span>{snapshot ? `${snapshot.readinessScore}% readiness` : "Opening streams"}</span>
        </div>
      </header>

      <section className={styles.commandStrip}>
        <div className={styles.livePulse}>
          <i />
          <span>
            <small>Realtime fabric</small>
            <strong>{streamState === "live" ? "SSE live with polling guard" : "Autonomous reconnect in progress"}</strong>
          </span>
        </div>
        <div className={styles.stripMetric}><small>Last update</small><strong>{generatedAt}</strong></div>
        <div className={styles.stripMetric}><small>Correlation</small><strong>{snapshot?.correlationId ?? "Pending"}</strong></div>
        <button className={styles.iconButton} type="button" onClick={() => void refreshSnapshot()} aria-label="Refresh connectivity snapshot" title="Refresh connectivity snapshot">
          <RefreshCw size={17} />
        </button>
      </section>

      {lastError ? <div className={styles.notice}><AlertTriangle size={16} /><span>{lastError}</span></div> : null}

      <section className={styles.kpiGrid} aria-label="Connection summary">
        <Kpi icon={Network} tone="blue" label="Service Mesh" value={`${totals.online}/${totals.total || 6}`} detail={`${totals.degraded} degraded, ${totals.offline} offline`} />
        <Kpi icon={Router} tone="green" label="Broker Link" value={statusLabel[snapshot?.broker.status ?? "connecting"]} detail={snapshot?.broker.server ?? "Binding terminal"} />
        <Kpi icon={LineChart} tone="gold" label="Market Feed" value={snapshot?.marketData.symbol ?? "XAUUSD"} detail={formatMarket(snapshot)} />
        <Kpi icon={Bot} tone="purple" label="AI Engine" value={`${snapshot?.aiEngine.activeAgents ?? 0}/${snapshot?.aiEngine.registeredAgents ?? 11}`} detail={`${snapshot?.aiEngine.queueDepth ?? 0} queued actions`} />
      </section>

      <div className={styles.workspace}>
        <section className={styles.leftColumn}>
          <article className={styles.panel}>
            <PanelHeader icon={PlugZap} title="Connection Topology" detail="Autonomous service binding, heartbeat monitoring, and retry status." />
            <div className={styles.serviceGrid}>
              {(snapshot?.services ?? []).map((service) => <ServiceCard key={service.id} service={service} />)}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={SatelliteDish} title="Broker and Market Data" detail="Execution bridge, symbol stream, price heartbeat, and data quality." />
            <div className={styles.twoUp}>
              <div className={styles.brokerCard}>
                <StatusPill status={snapshot?.broker.status ?? "connecting"} />
                <h3>{snapshot?.broker.brokerName ?? "Primary Gold Broker"}</h3>
                <dl>
                  <div><dt>Terminal</dt><dd>{snapshot?.broker.terminal ?? "Binding"}</dd></div>
                  <div><dt>Account</dt><dd>{snapshot?.broker.account ?? "Pending"}</dd></div>
                  <div><dt>Mode</dt><dd>{snapshot?.broker.tradeMode ?? "unconfigured"}</dd></div>
                  <div><dt>Ping</dt><dd>{formatMs(snapshot?.broker.pingMs)}</dd></div>
                  <div><dt>Spread</dt><dd>{snapshot?.broker.spreadPoints ? `${snapshot.broker.spreadPoints} pts` : "Unavailable"}</dd></div>
                </dl>
              </div>
              <div className={styles.marketCard}>
                <div className={styles.priceHeader}>
                  <span>{snapshot?.marketData.symbol ?? "XAUUSD"}</span>
                  <StatusPill status={snapshot?.marketData.status ?? "connecting"} />
                </div>
                <div className={styles.priceGrid}>
                  <div><small>Bid</small><strong>{formatPrice(snapshot?.marketData.bid)}</strong></div>
                  <div><small>Ask</small><strong>{formatPrice(snapshot?.marketData.ask)}</strong></div>
                  <div><small>Spread</small><strong>{snapshot?.marketData.spread ?? "n/a"}</strong></div>
                  <div><small>Ticks/min</small><strong>{snapshot?.marketData.ticksPerMinute ?? 0}</strong></div>
                </div>
                <div className={styles.signalChart} aria-hidden="true">
                  {Array.from({ length: 34 }, (_, index) => <i key={index} style={{ height: `${28 + ((index * 13) % 56)}%` }} />)}
                </div>
              </div>
            </div>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <div className={styles.scoreHeader}><h3>Health Score</h3><span>{snapshot?.readinessScore ?? 0}%</span></div>
            <div className={styles.scoreRing} style={{ "--progress": `${(snapshot?.readinessScore ?? 0) * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{snapshot?.readinessScore ?? 0}%</strong><small>Ready</small></div>
            </div>
            <ul className={styles.healthList}>
              {snapshot ? Object.entries(snapshot.diagnostics).map(([key, value]) => (
                <li key={key}><span>{labelize(key)}</span><StatusDot status={value} /></li>
              )) : null}
            </ul>
          </article>

          <article className={styles.railCard}>
            <PanelHeader compact icon={ShieldCheck} title="Alerts" detail={`${snapshot?.alerts.length ?? 0} active`} />
            <div className={styles.alertList}>
              {(snapshot?.alerts.length ? snapshot.alerts : [{ id: "no-alerts", severity: "info" as const, title: "No active critical alerts", detail: "Connectivity monitor is waiting for production endpoints.", createdAt: new Date().toISOString() }]).map((alert) => (
                <div className={`${styles.alertItem} ${styles[alert.severity]}`} key={alert.id}>
                  <AlertTriangle size={15} />
                  <span><strong>{alert.title}</strong><small>{alert.detail}</small></span>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.railCard}>
            <PanelHeader compact icon={TerminalSquare} title="Live Logs" detail="Newest first" />
            <div className={styles.logList}>
              {(snapshot?.logs ?? []).map((log) => (
                <div className={styles.logItem} key={log.id}>
                  <time>{new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(log.timestamp))}</time>
                  <span>{log.source}</span>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, tone, label, value, detail }: { icon: typeof Activity; tone: string; label: string; value: string; detail: string }) {
  return <article className={styles.kpi}><span className={`${styles.kpiIcon} ${styles[tone]}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

function PanelHeader({ icon: Icon, title, detail, compact = false }: { icon: typeof Activity; title: string; detail: string; compact?: boolean }) {
  return <header className={compact ? styles.compactHeader : styles.panelHeader}><span><Icon size={compact ? 16 : 19} /></span><div><h2>{title}</h2><p>{detail}</p></div></header>;
}

function ServiceCard({ service }: { service: ConnectivitySnapshot["services"][number] }) {
  const Icon = service.kind === "database" ? Database : service.kind === "ai-engine" ? CloudCog : service.kind === "market-data" ? LineChart : service.kind === "broker" ? Server : service.kind === "realtime" ? Wifi : Zap;
  return (
    <article className={`${styles.serviceCard} ${styles[service.status]}`}>
      <div className={styles.serviceTop}><span><Icon size={18} /></span><StatusPill status={service.status} /></div>
      <strong>{service.name}</strong>
      <small>{service.endpoint}</small>
      <div className={styles.serviceMetrics}>
        <span><b>{formatMs(service.latencyMs)}</b><small>Latency</small></span>
        <span><b>{service.uptimePercent.toFixed(2)}%</b><small>Uptime</small></span>
      </div>
      <p>{service.evidence}</p>
    </article>
  );
}

function StatusPill({ status }: { status: ConnectivityStatus }) {
  const Icon = statusIcon[status];
  return <span className={`${styles.statusPill} ${styles[status]}`}><Icon className={status === "connecting" ? styles.spin : undefined} size={13} />{statusLabel[status]}</span>;
}

function StatusDot({ status }: { status: ConnectivityStatus }) {
  return <span className={`${styles.statusDot} ${styles[status]}`}><CircleDot size={13} />{statusLabel[status]}</span>;
}

function formatMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value} ms` : "n/a";
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}

function formatMarket(snapshot: ConnectivitySnapshot | null) {
  if (!snapshot) return "Waiting for feed";
  return `${formatPrice(snapshot.marketData.bid)} / ${formatPrice(snapshot.marketData.ask)}`;
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
