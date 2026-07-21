"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageSquareShare,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mt5SessionPanel } from "@/components/platform-readiness/mt5-session-panel";
import type {
  ConnectivityDebugResponse,
  ConnectivitySnapshot,
  ConnectivitySnapshotResponse,
  ConnectivityStatus,
} from "@/types/connectivity";
import styles from "./real-time-messaging-page.module.css";

type StreamMode = "connecting" | "live" | "reconnecting" | "polling";

type ChannelCard = {
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

export function RealTimeMessagingPage() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<ConnectivityDebugResponse | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const reconnectCount = useRef(0);

  const refreshDebugOnly = useCallback(async () => {
    try {
      const response = await fetch("/api/platform-readiness/connect/debug", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const payload = (await response.json()) as ConnectivityDebugResponse;
      setDebugData(payload);
    } catch {
      // Keep the last good debug snapshot on transient failures.
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [snapshotResponse, debugResponse] = await Promise.all([
        fetch("/api/platform-readiness/connect", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/platform-readiness/connect/debug", { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);

      if (!snapshotResponse.ok) throw new Error(`Realtime messaging snapshot failed with ${snapshotResponse.status}`);
      if (!debugResponse.ok) throw new Error(`Realtime messaging debug failed with ${debugResponse.status}`);

      const snapshotPayload = (await snapshotResponse.json()) as ConnectivitySnapshotResponse;
      const debugPayload = (await debugResponse.json()) as ConnectivityDebugResponse;

      setSnapshot(snapshotPayload.snapshot);
      setDebugData(debugPayload);
      setLastError(null);
      return snapshotPayload.snapshot;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Realtime messaging refresh failed");
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
      void refreshDebugOnly();
    });

    source.addEventListener("error", () => {
      if (closed) return;
      reconnectCount.current += 1;
      setStreamMode(reconnectCount.current > 2 ? "polling" : "reconnecting");
      setLastError("Realtime messaging stream interrupted; autonomous polling fallback is active.");
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

  const brokerService = snapshot?.services.find((service) => service.id === "mt5-bridge");
  const auditService = snapshot?.services.find((service) => service.id === "audit-stream");
  const databaseService = snapshot?.services.find((service) => service.id === "database");
  const marketService = snapshot?.services.find((service) => service.id === "market-feed");
  const newsService = snapshot?.services.find((service) => service.id === "news-calendar");

  const channels = useMemo<ChannelCard[]>(
    () => [
      {
        id: "sse-backbone",
        label: "SSE Backbone",
        detail: "Shared operational stream for pages that consume autonomous connection evidence.",
        status: streamMode === "live" ? "online" : streamMode === "polling" ? "degraded" : "connecting",
        latencyMs: auditService?.latencyMs ?? null,
        icon: Radio,
      },
      {
        id: "audit-publish",
        label: "Audit Publish",
        detail: "Publish connection state transitions and runtime events for operators and compliance.",
        status: auditService?.status ?? "connecting",
        latencyMs: auditService?.latencyMs ?? null,
        icon: Send,
      },
      {
        id: "terminal-events",
        label: "Terminal Events",
        detail: "Route MT5 session and quote events from the selected tenant-terminal profile.",
        status: brokerService?.status ?? "connecting",
        latencyMs: debugData?.mt5?.pingMs ?? brokerService?.latencyMs ?? null,
        icon: MessageSquareShare,
      },
      {
        id: "database-fanout",
        label: "Database Fanout",
        detail: "Durably persist messaging evidence for replay, monitoring, and tenant traceability.",
        status: databaseService?.status ?? "connecting",
        latencyMs: databaseService?.latencyMs ?? null,
        icon: ShieldCheck,
      },
      {
        id: "market-sync",
        label: "Market Sync",
        detail: "Attach market and quote context to outbound runtime events and broadcast state.",
        status: marketService?.status ?? "connecting",
        latencyMs: marketService?.latencyMs ?? null,
        icon: Activity,
      },
      {
        id: "news-context",
        label: "News Context",
        detail: "Annotate realtime messages with macro-event risk for decision consumers.",
        status: newsService?.status ?? "connecting",
        latencyMs: newsService?.latencyMs ?? null,
        icon: Wifi,
      },
    ],
    [
      auditService?.latencyMs,
      auditService?.status,
      brokerService?.latencyMs,
      brokerService?.status,
      databaseService?.latencyMs,
      databaseService?.status,
      debugData?.mt5?.pingMs,
      marketService?.latencyMs,
      marketService?.status,
      newsService?.latencyMs,
      newsService?.status,
      streamMode,
    ],
  );

  const profiles = debugData?.sessions ?? [];
  const activeProfileId = debugData?.activeSessionId ?? null;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const detectedTerminals = debugData?.terminals ?? [];
  const channelHealth = channels.filter((channel) => channel.status === "online").length;
  const lastUpdate = snapshot ? formatTime(snapshot.generatedAt) : "Loading";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} />
        <span>Connect</span>
        <ChevronRight size={13} />
        <strong>Real-Time Messaging</strong>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>03.6</span>
            <div>
              <p>Autonomous event distribution</p>
              <h1>Real-Time Messaging</h1>
            </div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>CONNECT.RT</span>
            <span>Mode: Multi-tenant</span>
            <span>SSE: {streamMode}</span>
            <span>Active tenant: {activeProfile?.tenantId ?? "Auto detect"}</span>
            <span>Owner: {activeProfile?.userId ?? "Shared"}</span>
            <span>Sessions: {profiles.length}</span>
          </div>
        </div>
        <StatusDecision status={auditService?.status ?? "connecting"} score={snapshot?.readinessScore ?? 0} />
      </header>

      <section className={styles.controlStrip}>
        <div className={styles.pulse}>
          <i />
          <span>
            <small>Messaging supervisor</small>
            <strong>{streamMode === "live" ? "Realtime event distribution active" : "Reconnect sequence active"}</strong>
          </span>
        </div>
        <div className={styles.stripMetric}>
          <small>Last update</small>
          <strong>{lastUpdate}</strong>
        </div>
        <div className={styles.stripMetric}>
          <small>Active profile</small>
          <strong>{activeProfile?.label ?? "Auto terminal selection"}</strong>
        </div>
        <button className={styles.iconButton} type="button" onClick={() => void refreshAll()} aria-label="Refresh realtime messaging" title="Refresh realtime messaging">
          <RefreshCw size={17} />
        </button>
      </section>

      {lastError ? <div className={styles.notice}><AlertTriangle size={15} /><span>{lastError}</span></div> : null}

      <section className={styles.heroGrid}>
        <article className={styles.heroPanel}>
          <div className={styles.heroTop}>
            <div>
              <small>Message fabric</small>
              <h2>{channelHealth}/{channels.length} channels online</h2>
              <p>Distribution now supports multiple tenant-terminal profiles, auto-detected local terminals, and server-side credential submission.</p>
            </div>
            <StatusPill status={auditService?.status ?? "connecting"} />
          </div>
          <div className={styles.metricGrid}>
            <MetricCard label="SSE backbone" value={streamMode === "live" ? "Live" : streamMode} detail="Shared page event stream" />
            <MetricCard label="Selected terminal" value={debugData?.mt5?.terminalName ?? "Pending"} detail={debugData?.mt5?.server ?? "Terminal route pending"} />
            <MetricCard label="Registered sessions" value={`${profiles.length}`} detail="Tenant terminal profiles stored server-side" />
            <MetricCard label="Detected terminals" value={`${detectedTerminals.length}`} detail="Auto-discovered local terminal executables" />
          </div>
          <div className={styles.heroFooter}>
            <span>Audit {statusText[auditService?.status ?? "connecting"]}</span>
            <span>Broker relay {statusText[brokerService?.status ?? "connecting"]}</span>
            <span>Database fanout {statusText[databaseService?.status ?? "connecting"]}</span>
          </div>
        </article>

        <Mt5SessionPanel
          title="Tenant Terminal Registry"
          description="Broker sessions are stored with tenant ownership, terminal-derived IDs, broker-server dropdowns, and account-type selection."
        />
      </section>

      <section className={styles.workspace}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span><MessageSquareShare size={19} /></span>
            <div>
              <h2>Realtime Channels</h2>
              <p>Backbone events, audit delivery, broker relay, and downstream consumer fanout.</p>
            </div>
          </div>
          <div className={styles.channelGrid}>
            {channels.map((channel) => (
              <ChannelPane channel={channel} key={channel.id} />
            ))}
          </div>
        </article>

        <article className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <span><Radio size={19} /></span>
            <div>
              <h2>Detected Local Terminals</h2>
              <p>Auto-discovered terminal executables on this machine for fallback or manual selection.</p>
            </div>
          </div>
          <div className={styles.candidateList}>
            {detectedTerminals.length ? detectedTerminals.map((terminal) => (
              <div className={styles.candidateItem} key={terminal.terminalId}>
                {terminal.terminalName} | {terminal.terminalPath}
              </div>
            )) : <div className={styles.candidateItem}>No local terminals detected</div>}
          </div>
        </article>
      </section>

      <section className={styles.footerGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span><Clock3 size={19} /></span>
            <div>
              <h2>Autonomous Actions</h2>
              <p>Messaging loop, session routing, and event publication.</p>
            </div>
          </div>
          <div className={styles.timeline}>
            <div><i /><p>Read realtime messaging snapshot and session registry</p><time>{lastUpdate}</time></div>
            <div><i /><p>Select active tenant-terminal profile or fallback auto-detect</p><time>{activeProfile?.label ?? "Auto"}</time></div>
            <div><i /><p>Publish audit and downstream consumer events</p><time>Live</time></div>
            <div><i /><p>Recover degraded channels with polling and reconnect orchestration</p><time>Auto</time></div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span><ShieldCheck size={19} /></span>
            <div>
              <h2>Connection Logs</h2>
              <p>Newest transport, broker, and local MT5 runtime events.</p>
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

function ChannelPane({ channel }: { channel: ChannelCard }) {
  const Icon = channel.icon;
  return (
    <article className={`${styles.channelCard} ${styles[channel.status]}`}>
      <div className={styles.channelTop}>
        <span><Icon size={18} /></span>
        <StatusPill status={channel.status} />
      </div>
      <strong>{channel.label}</strong>
      <p>{channel.detail}</p>
      <small>{formatMs(channel.latencyMs)} latency</small>
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
      <small>Messaging Decision</small>
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
