"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DatabaseZap,
  Gauge,
  History,
  KeyRound,
  LineChart,
  PlugZap,
  RadioTower,
  RefreshCw,
  Router,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  WifiOff,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrokerConnectivity, ConnectivitySnapshot, ConnectivitySnapshotResponse, ConnectivityStatus } from "@/types/connectivity";
import styles from "./mt5-bridge-page.module.css";

type StreamMode = "connecting" | "live" | "reconnecting" | "polling";

type BridgeChannel = {
  id: string;
  label: string;
  description: string;
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

export function Mt5BridgePage() {
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
      if (!response.ok) throw new Error(`MT5 bridge snapshot failed with ${response.status}`);
      const payload = await response.json() as ConnectivitySnapshotResponse;
      setSnapshot(payload.snapshot);
      setLastError(null);
      return payload.snapshot;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "MT5 bridge refresh failed");
      return null;
    }
  }, []);

  useEffect(() => {
    let closed = false;
    const source = new EventSource("/api/platform-readiness/connect/stream");

    source.addEventListener("open", () => {
      if (closed) return;
      setStreamMode("live");
      setLastError(null);
    });

    source.addEventListener("snapshot", (event) => {
      if (closed) return;
      setSnapshot(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);
      setStreamMode("live");
    });

    source.addEventListener("error", () => {
      if (closed) return;
      reconnectCount.current += 1;
      setStreamMode(reconnectCount.current > 2 ? "polling" : "reconnecting");
      setLastError("Realtime MT5 bridge stream interrupted; autonomous polling fallback is active.");
      if (!fallbackTimer.current) {
        fallbackTimer.current = window.setInterval(refreshSnapshot, 6000);
      }
    });

    void refreshSnapshot();

    return () => {
      closed = true;
      source.close();
      if (fallbackTimer.current) window.clearInterval(fallbackTimer.current);
    };
  }, [refreshSnapshot]);

  const broker = snapshot?.broker ?? emptyBroker();
  const bridgeService = snapshot?.services.find((service) => service.id === "mt5-bridge");
  const marketService = snapshot?.services.find((service) => service.id === "market-feed");
  const databaseService = snapshot?.services.find((service) => service.id === "database");

  const channels = useMemo<BridgeChannel[]>(() => [
    { id: "terminal-heartbeat", label: "Terminal Heartbeat", description: "MT5 process, account session, and bridge agent liveness.", status: broker.status, latencyMs: broker.pingMs, icon: RadioTower },
    { id: "price-stream", label: "Price Stream", description: "XAUUSD bid/ask tick ingestion and spread guard.", status: snapshot?.marketData.status ?? "connecting", latencyMs: marketService?.latencyMs ?? null, icon: LineChart },
    { id: "trade-permissions", label: "Trade Permissions", description: "Order, position, account-state, and execution scopes.", status: broker.permissions.length >= 4 ? broker.status : "offline", latencyMs: bridgeService?.latencyMs ?? null, icon: KeyRound },
    { id: "order-router", label: "Order Router", description: "Market order, pending order, modify, and cancel command lane.", status: broker.status === "online" ? "online" : broker.status === "degraded" ? "degraded" : "offline", latencyMs: bridgeService?.latencyMs ?? null, icon: Router },
    { id: "position-sync", label: "Position Sync", description: "Open position, exposure, basket, and stop reconciliation.", status: databaseService?.status ?? "connecting", latencyMs: databaseService?.latencyMs ?? null, icon: DatabaseZap },
    { id: "risk-lock", label: "Risk Lock", description: "Fail-closed execution gate and emergency shutdown handshake.", status: broker.status === "offline" ? "offline" : "degraded", latencyMs: 12, icon: ShieldCheck },
  ], [broker.permissions.length, broker.pingMs, broker.status, bridgeService?.latencyMs, databaseService?.latencyMs, databaseService?.status, marketService?.latencyMs, snapshot?.marketData.status]);

  const onlineChannels = channels.filter((channel) => channel.status === "online").length;
  const lastUpdate = snapshot ? formatTime(snapshot.generatedAt) : "Loading";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} />
        <span>Connect</span>
        <ChevronRight size={13} />
        <strong>MT5 Bridge</strong>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>03.1</span>
            <div>
              <p>Autonomous broker connectivity</p>
              <h1>MT5 Bridge</h1>
            </div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>CONNECT.MT5</span>
            <span>Mode: Autonomous</span>
            <span>SSE: {streamMode}</span>
            <span>Terminal: {broker.terminal}</span>
            <span>Audit: audit.platform-readiness.connect.mt5-bridge</span>
          </div>
        </div>
        <StatusDecision status={broker.status} score={snapshot?.readinessScore ?? 0} />
      </header>

      <section className={styles.controlStrip}>
        <div className={styles.pulse}><i /><span><small>Bridge supervisor</small><strong>{streamMode === "live" ? "Realtime monitoring active" : "Reconnect sequence active"}</strong></span></div>
        <div className={styles.stripMetric}><small>Last heartbeat</small><strong>{lastUpdate}</strong></div>
        <div className={styles.stripMetric}><small>Correlation</small><strong>{snapshot?.correlationId ?? "Pending"}</strong></div>
        <button className={styles.iconButton} type="button" onClick={() => void refreshSnapshot()} aria-label="Refresh MT5 bridge snapshot" title="Refresh MT5 bridge snapshot"><RefreshCw size={17} /></button>
      </section>

      {lastError ? <div className={styles.notice}><AlertTriangle size={15} /><span>{lastError}</span></div> : null}

      <section className={styles.kpiGrid} aria-label="MT5 bridge status">
        <Kpi icon={ServerCog} tone="teal" label="Bridge Status" value={statusText[broker.status]} detail={bridgeService?.endpoint ?? "MT5 bridge endpoint not configured"} />
        <Kpi icon={Gauge} tone="blue" label="Latency" value={formatMs(broker.pingMs)} detail={`Spread ${broker.spreadPoints ? `${broker.spreadPoints} pts` : "unavailable"}`} />
        <Kpi icon={PlugZap} tone="gold" label="Channels" value={`${onlineChannels}/${channels.length}`} detail="Autonomous bridge lanes online" />
        <Kpi icon={Zap} tone="purple" label="Trade Mode" value={broker.tradeMode} detail={`${broker.permissions.length} bridge permissions discovered`} />
      </section>

      <div className={styles.workspace}>
        <section className={styles.mainColumn}>
          <article className={styles.panel}>
            <PanelHeader icon={TerminalSquare} title="Terminal Session" detail="MT5 terminal identity, broker server binding, permissions, and execution posture." />
            <div className={styles.terminalGrid}>
              <div className={styles.terminalCard}>
                <StatusPill status={broker.status} />
                <h2>{broker.brokerName}</h2>
                <dl>
                  <div><dt>Terminal</dt><dd>{broker.terminal}</dd></div>
                  <div><dt>Account</dt><dd>{broker.account}</dd></div>
                  <div><dt>Server</dt><dd>{broker.server}</dd></div>
                  <div><dt>Mode</dt><dd>{broker.tradeMode}</dd></div>
                  <div><dt>Ping</dt><dd>{formatMs(broker.pingMs)}</dd></div>
                </dl>
              </div>
              <div className={styles.permissionPanel}>
                <h3>Bridge Permissions</h3>
                <div className={styles.permissionGrid}>
                  {["prices", "positions", "orders", "account-state", "history", "risk-lock"].map((permission) => (
                    <div className={broker.permissions.includes(permission) || permission === "risk-lock" ? styles.permissionReady : styles.permissionBlocked} key={permission}>
                      {broker.permissions.includes(permission) || permission === "risk-lock" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      <span>{permission}</span>
                    </div>
                  ))}
                </div>
                <p>Execution remains fail-closed until bridge credentials, terminal account state, and risk lock are all confirmed by backend health evidence.</p>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={Activity} title="Bridge Channels" detail="Heartbeat, quotes, execution commands, reconciliation, and safety interlocks." />
            <div className={styles.channelGrid}>
              {channels.map((channel) => <ChannelCard channel={channel} key={channel.id} />)}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={LineChart} title="Live Gold Feed" detail="Broker-sourced XAUUSD pricing and tick freshness from the shared connectivity monitor." />
            <div className={styles.feedPanel}>
              <div className={styles.priceTiles}>
                <div><small>Symbol</small><strong>{snapshot?.marketData.symbol ?? "XAUUSD"}</strong></div>
                <div><small>Bid</small><strong>{formatPrice(snapshot?.marketData.bid)}</strong></div>
                <div><small>Ask</small><strong>{formatPrice(snapshot?.marketData.ask)}</strong></div>
                <div><small>Ticks/min</small><strong>{snapshot?.marketData.ticksPerMinute ?? 0}</strong></div>
              </div>
              <div className={styles.waveform} aria-hidden="true">
                {Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${24 + ((index * 11) % 62)}%` }} />)}
              </div>
            </div>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <div className={styles.scoreHeader}><h3>Bridge Readiness</h3><span>{snapshot?.readinessScore ?? 0}%</span></div>
            <div className={styles.scoreRing} style={{ "--progress": `${(snapshot?.readinessScore ?? 0) * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{snapshot?.readinessScore ?? 0}%</strong><small>Ready</small></div>
            </div>
            <ul className={styles.statusList}>
              <li><span>Terminal</span><StatusPill status={broker.status} /></li>
              <li><span>Market feed</span><StatusPill status={snapshot?.marketData.status ?? "connecting"} /></li>
              <li><span>Database sync</span><StatusPill status={databaseService?.status ?? "connecting"} /></li>
              <li><span>Risk lock</span><StatusPill status={broker.status === "offline" ? "offline" : "degraded"} /></li>
            </ul>
          </article>

          <article className={styles.railCard}>
            <PanelHeader compact icon={Clock3} title="Autonomous Actions" detail="Current bridge loop" />
            <div className={styles.timeline}>
              <div><i /><p>Read connectivity snapshot</p><time>{lastUpdate}</time></div>
              <div><i /><p>Validate MT5 terminal heartbeat</p><time>Auto</time></div>
              <div><i /><p>Reconcile account and symbol state</p><time>Auto</time></div>
              <div><i /><p>Publish bridge health evidence</p><time>Live</time></div>
            </div>
          </article>

          <article className={styles.railCard}>
            <PanelHeader compact icon={History} title="Bridge Logs" detail="Newest events" />
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

function ChannelCard({ channel }: { channel: BridgeChannel }) {
  const Icon = channel.icon;
  return (
    <article className={`${styles.channelCard} ${styles[channel.status]}`}>
      <div className={styles.channelTop}><span><Icon size={18} /></span><StatusPill status={channel.status} /></div>
      <strong>{channel.label}</strong>
      <p>{channel.description}</p>
      <small>{formatMs(channel.latencyMs)} latency</small>
    </article>
  );
}

function StatusDecision({ status, score }: { status: ConnectivityStatus; score: number }) {
  const Icon = statusIcon[status];
  return <div className={`${styles.decision} ${styles[status]}`}><small>Bridge Decision</small><strong><Icon className={status === "connecting" ? styles.spin : undefined} size={15} />{statusText[status]}</strong><span>{score}% connectivity readiness</span></div>;
}

function StatusPill({ status }: { status: ConnectivityStatus }) {
  const Icon = statusIcon[status];
  return <span className={`${styles.statusPill} ${styles[status]}`}><Icon className={status === "connecting" ? styles.spin : undefined} size={13} />{statusText[status]}</span>;
}

function emptyBroker(): BrokerConnectivity {
  return {
    status: "connecting",
    brokerName: "Primary Gold Broker",
    terminal: "MT5 Terminal",
    account: "Binding",
    server: "Resolving",
    tradeMode: "unconfigured",
    pingMs: null,
    spreadPoints: null,
    permissions: [],
  };
}

function formatMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value} ms` : "n/a";
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
