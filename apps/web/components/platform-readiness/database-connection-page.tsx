"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileClock,
  HardDriveDownload,
  History,
  RefreshCw,
  ShieldCheck,
  TableProperties,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConnectivityDebugResponse,
  ConnectivitySnapshot,
  ConnectivitySnapshotResponse,
  ConnectivityStatus,
  Mt5TerminalDebug,
} from "@/types/connectivity";
import styles from "./database-connection-page.module.css";

type StreamMode = "connecting" | "live" | "reconnecting" | "polling";

type PersistenceLane = {
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

export function DatabaseConnectionPage() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot | null>(null);
  const [mt5Debug, setMt5Debug] = useState<Mt5TerminalDebug | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const reconnectCount = useRef(0);

  const refreshAll = useCallback(async () => {
    try {
      const [snapshotResponse, debugResponse] = await Promise.all([
        fetch("/api/platform-readiness/connect", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/platform-readiness/connect/debug", { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);

      if (!snapshotResponse.ok) throw new Error(`Database snapshot failed with ${snapshotResponse.status}`);
      if (!debugResponse.ok) throw new Error(`Connection debug failed with ${debugResponse.status}`);

      const snapshotPayload = (await snapshotResponse.json()) as ConnectivitySnapshotResponse;
      const debugPayload = (await debugResponse.json()) as ConnectivityDebugResponse;

      setSnapshot(snapshotPayload.snapshot);
      setMt5Debug(debugPayload.mt5);
      setLastError(null);

      return snapshotPayload.snapshot;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Database connection refresh failed");
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
      setLastError("Realtime database stream interrupted; autonomous polling fallback is active.");
      if (!fallbackTimer.current) {
        fallbackTimer.current = window.setInterval(() => {
          void refreshAll();
        }, 6000);
      }
    });

    void refreshAll();

    return () => {
      closed = true;
      source.close();
      stopFallbackPolling();
    };
  }, [refreshAll]);

  const databaseService = snapshot?.services.find((service) => service.id === "database");
  const marketService = snapshot?.services.find((service) => service.id === "market-feed");
  const brokerService = snapshot?.services.find((service) => service.id === "mt5-bridge");
  const auditService = snapshot?.services.find((service) => service.id === "audit-stream");
  const newsService = snapshot?.services.find((service) => service.id === "news-calendar");

  const lanes = useMemo<PersistenceLane[]>(
    () => [
      {
        id: "quote-writes",
        label: "Quote Writes",
        detail: "Persist XAUUSD ticks, spreads, and freshness checkpoints into operational storage.",
        status: databaseService?.status ?? "connecting",
        latencyMs: databaseService?.latencyMs ?? null,
        icon: Database,
      },
      {
        id: "audit-journal",
        label: "Audit Journal",
        detail: "Record every feed-state decision, degradation, and autonomous recovery event.",
        status: auditService?.status ?? "connecting",
        latencyMs: auditService?.latencyMs ?? null,
        icon: FileClock,
      },
      {
        id: "mt5-ingest",
        label: "MT5 Ingest",
        detail: "Ingest terminal-sourced ticks and account context into the persistence boundary.",
        status: brokerService?.status ?? "connecting",
        latencyMs: mt5Debug?.pingMs ?? brokerService?.latencyMs ?? null,
        icon: HardDriveDownload,
      },
      {
        id: "schema-guard",
        label: "Schema Guard",
        detail: "Protect table shape, write integrity, and downstream reader compatibility.",
        status: snapshot?.diagnostics.auth ?? "connecting",
        latencyMs: databaseService?.latencyMs ?? null,
        icon: TableProperties,
      },
      {
        id: "market-context",
        label: "Market Context",
        detail: "Link persisted quote snapshots with provider and macro-event context.",
        status: marketService?.status ?? "connecting",
        latencyMs: marketService?.latencyMs ?? null,
        icon: Activity,
      },
      {
        id: "recovery-guard",
        label: "Recovery Guard",
        detail: "Retain failover posture and recovery checkpoints when sources degrade.",
        status: snapshot?.diagnostics.failover ?? "connecting",
        latencyMs: auditService?.latencyMs ?? null,
        icon: ShieldCheck,
      },
    ],
    [
      auditService?.latencyMs,
      auditService?.status,
      brokerService?.latencyMs,
      brokerService?.status,
      databaseService?.latencyMs,
      databaseService?.status,
      marketService?.latencyMs,
      marketService?.status,
      mt5Debug?.pingMs,
      snapshot?.diagnostics.auth,
      snapshot?.diagnostics.failover,
    ],
  );

  const onlineLanes = lanes.filter((lane) => lane.status === "online").length;
  const lastUpdate = snapshot ? formatTime(snapshot.generatedAt) : "Loading";
  const lastTick = snapshot?.marketData.lastTickAt ? formatRelativeTime(snapshot.marketData.lastTickAt) : "Awaiting market data";
  const selectedTerminal = mt5Debug?.terminalName ?? "Selection pending";
  const selectedPath = mt5Debug?.terminalPath ?? "No terminal selected yet";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} />
        <span>Connect</span>
        <ChevronRight size={13} />
        <strong>Database Connection</strong>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>03.5</span>
            <div>
              <p>Autonomous persistence fabric</p>
              <h1>Database Connection</h1>
            </div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>CONNECT.DB</span>
            <span>Mode: Autonomous</span>
            <span>SSE: {streamMode}</span>
            <span>Database: {statusText[databaseService?.status ?? "connecting"]}</span>
            <span>Audit: audit.platform-readiness.connect.database</span>
          </div>
        </div>
        <StatusDecision status={databaseService?.status ?? "connecting"} score={snapshot?.readinessScore ?? 0} />
      </header>

      <section className={styles.controlStrip}>
        <div className={styles.pulse}>
          <i />
          <span>
            <small>Persistence supervisor</small>
            <strong>{streamMode === "live" ? "Realtime persistence monitor active" : "Reconnect sequence active"}</strong>
          </span>
        </div>
        <div className={styles.stripMetric}>
          <small>Last update</small>
          <strong>{lastUpdate}</strong>
        </div>
        <div className={styles.stripMetric}>
          <small>Correlation</small>
          <strong>{snapshot?.correlationId ?? "Pending"}</strong>
        </div>
        <button
          className={styles.iconButton}
          type="button"
          onClick={() => void refreshAll()}
          aria-label="Refresh database connection snapshot"
          title="Refresh database connection snapshot"
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
              <small>Operational persistence boundary</small>
              <h2>{statusText[databaseService?.status ?? "connecting"]}</h2>
              <p>Market data, audit evidence, and execution context remain durable only when persistence and source routing stay healthy.</p>
            </div>
            <StatusPill status={databaseService?.status ?? "connecting"} />
          </div>

          <div className={styles.metricGrid}>
            <MetricCard label="Write latency" value={formatMs(databaseService?.latencyMs)} detail="Operational database response" />
            <MetricCard label="Audit stream" value={statusText[auditService?.status ?? "connecting"]} detail="Realtime durability evidence" />
            <MetricCard label="Last tick seen" value={lastTick} detail="Latest upstream market sample" />
            <MetricCard label="Healthy lanes" value={`${onlineLanes}/${lanes.length}`} detail="Persistence controls online" />
          </div>

          <div className={styles.heroFooter}>
            <span>Endpoint {databaseService?.endpoint ?? "Not configured"}</span>
            <span>MT5 source {selectedTerminal}</span>
            <span>Readiness {snapshot?.readinessScore ?? 0}%</span>
          </div>
        </article>

        <article className={styles.terminalPanel}>
          <div className={styles.panelHeader}>
            <span><HardDriveDownload size={19} /></span>
            <div>
              <h2>Visible MT5 Source Selection</h2>
              <p>The active local terminal choice is surfaced here in the UI instead of being hidden only in backend configuration.</p>
            </div>
          </div>

          <div className={styles.terminalCard}>
            <div className={styles.terminalHead}>
              <div>
                <small>Selected terminal</small>
                <strong>{selectedTerminal}</strong>
              </div>
              <StatusPill status={mt5Debug?.ok ? "online" : mt5Debug?.terminalDetected ? "degraded" : "offline"} />
            </div>
            <code>{selectedPath}</code>
            <dl>
              <div><dt>Broker</dt><dd>{mt5Debug?.brokerName ?? "Pending"}</dd></div>
              <div><dt>Server</dt><dd>{mt5Debug?.server ?? "Pending"}</dd></div>
              <div><dt>Account</dt><dd>{mt5Debug?.accountLogin ?? "Pending"}</dd></div>
              <div><dt>Trade mode</dt><dd>{mt5Debug?.tradeMode ?? "unconfigured"}</dd></div>
              <div><dt>Ping</dt><dd>{formatMs(mt5Debug?.pingMs)}</dd></div>
              <div><dt>Symbol</dt><dd>{mt5Debug?.symbol ?? "XAUUSD"}</dd></div>
            </dl>
          </div>

          <div className={styles.candidateList}>
            <h3>Detected Terminal Candidates</h3>
            {(mt5Debug?.detectedTerminalPaths.length ? mt5Debug.detectedTerminalPaths : ["No candidate terminals detected"]).map((candidate) => (
              <div className={styles.candidateItem} key={candidate}>{candidate}</div>
            ))}
          </div>

          {mt5Debug?.error ? <div className={styles.inlineWarning}><AlertTriangle size={14} /><span>{mt5Debug.error}</span></div> : null}
        </article>
      </section>

      <section className={styles.workspace}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span><Database size={19} /></span>
            <div>
              <h2>Persistence Lanes</h2>
              <p>Upstream ingestion, durable writes, audit journaling, and recovery controls that support autonomous trading.</p>
            </div>
          </div>
          <div className={styles.laneGrid}>
            {lanes.map((lane) => (
              <LaneCard lane={lane} key={lane.id} />
            ))}
          </div>
        </article>

        <article className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <span><ShieldCheck size={19} /></span>
            <div>
              <h2>Storage Contract</h2>
              <p>Database readiness, audit durability, and upstream dependency posture.</p>
            </div>
          </div>
          <ul className={styles.statusList}>
            <li><span>Operational database</span><StatusPill status={databaseService?.status ?? "connecting"} /></li>
            <li><span>Market feed source</span><StatusPill status={marketService?.status ?? "connecting"} /></li>
            <li><span>MT5 ingest source</span><StatusPill status={brokerService?.status ?? "connecting"} /></li>
            <li><span>Audit stream</span><StatusPill status={auditService?.status ?? "connecting"} /></li>
            <li><span>News context</span><StatusPill status={newsService?.status ?? "connecting"} /></li>
            <li><span>Failover guard</span><StatusPill status={snapshot?.diagnostics.failover ?? "connecting"} /></li>
          </ul>
        </article>
      </section>

      <section className={styles.footerGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span><Clock3 size={19} /></span>
            <div>
              <h2>Autonomous Actions</h2>
              <p>Database connection loop, write validation, and source coordination.</p>
            </div>
          </div>
          <div className={styles.timeline}>
            <div><i /><p>Read persistence snapshot and source debug state</p><time>{lastUpdate}</time></div>
            <div><i /><p>Validate MT5 source, feed freshness, and audit publication</p><time>{lastTick}</time></div>
            <div><i /><p>Commit operational evidence and recover degraded writes</p><time>Auto</time></div>
            <div><i /><p>Hold autonomous progression when durability drops</p><time>Live</time></div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span><History size={19} /></span>
            <div>
              <h2>Connection Logs</h2>
              <p>Newest persistence and source-state events.</p>
            </div>
          </div>
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

function LaneCard({ lane }: { lane: PersistenceLane }) {
  const Icon = lane.icon;
  return (
    <article className={`${styles.laneCard} ${styles[lane.status]}`}>
      <div className={styles.laneTop}>
        <span><Icon size={18} /></span>
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

function StatusDecision({ status, score }: { status: ConnectivityStatus; score: number }) {
  const Icon = statusIcon[status];
  return (
    <div className={`${styles.decision} ${styles[status]}`}>
      <small>Database Decision</small>
      <strong><Icon className={status === "connecting" ? styles.spin : undefined} size={15} />{statusText[status]}</strong>
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const deltaSeconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
  if (deltaSeconds <= 1) return "Just now";
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  return `${Math.round(deltaSeconds / 60)}m ago`;
}
