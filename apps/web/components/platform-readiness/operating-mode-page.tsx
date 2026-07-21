"use client";

import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Database,
  Info,
  LayoutDashboard,
  MonitorCheck,
  PauseCircle,
  RadioTower,
  RefreshCw,
  RotateCw,
  Server,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectivitySnapshot, ConnectivitySnapshotResponse } from "@/types/connectivity";
import type { LifecycleControlResponse, LifecycleRuntime, LifecycleRuntimeStatus } from "@/types/lifecycle-control";
import styles from "./operating-mode-page.module.css";

const REFRESH_INTERVAL_MS = 5000;

type StreamMode = "connecting" | "live" | "polling";
type Tone = "purple" | "green" | "orange" | "red";

type StatusRow = {
  title: string;
  value: string;
  tone: Tone;
  detail: string;
  icon: typeof RadioTower;
};

export function OperatingModePage() {
  const [runtime, setRuntime] = useState<LifecycleRuntime | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("connecting");
  const [lastReceivedAt, setLastReceivedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshPending = useRef(false);
  const mounted = useRef(true);

  const refreshAll = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    if (mounted.current) setRefreshing(true);

    try {
      const [runtimeResponse, connectivityResponse] = await Promise.all([
        fetch("/api/lifecycle-control", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/platform-readiness/connect", { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);

      if (!runtimeResponse.ok) throw new Error(`Lifecycle state failed with ${runtimeResponse.status}`);
      if (!connectivityResponse.ok) throw new Error(`Connectivity state failed with ${connectivityResponse.status}`);

      const runtimePayload = await runtimeResponse.json() as LifecycleControlResponse;
      const connectivityPayload = await connectivityResponse.json() as ConnectivitySnapshotResponse;
      if (!mounted.current) return;
      setRuntime(runtimePayload.runtime);
      setConnectivity(connectivityPayload.snapshot);
      setLastReceivedAt(new Date().toISOString());
      setLastError(null);
    } catch (error) {
      if (mounted.current) setLastError(error instanceof Error ? error.message : "Operating mode refresh failed");
    } finally {
      refreshPending.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const lifecycleStream = new EventSource("/api/executive/lifecycle-command-centre/stream");
    const connectivityStream = new EventSource("/api/platform-readiness/connect/stream");
    const pollTimer = window.setInterval(() => void refreshAll(), REFRESH_INTERVAL_MS);
    const onRuntimeUpdate = () => void refreshAll();

    const markLive = () => setStreamMode("live");
    const markPolling = () => setStreamMode("polling");

    lifecycleStream.addEventListener("open", markLive);
    lifecycleStream.addEventListener("message", () => void refreshAll());
    lifecycleStream.addEventListener("error", markPolling);
    connectivityStream.addEventListener("open", markLive);
    connectivityStream.addEventListener("snapshot", (event) => {
      try {
        setConnectivity(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);
        setLastReceivedAt(new Date().toISOString());
        setLastError(null);
        setStreamMode("live");
      } catch {
        setLastError("A realtime connectivity event could not be decoded.");
      }
    });
    connectivityStream.addEventListener("error", markPolling);
    window.addEventListener("lifecycle-runtime-updated", onRuntimeUpdate);

    void refreshAll();

    return () => {
      mounted.current = false;
      lifecycleStream.close();
      connectivityStream.close();
      window.clearInterval(pollTimer);
      window.removeEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    };
  }, [refreshAll]);

  const broker = connectivity?.broker;
  const operatingMode = broker?.tradeMode ?? "unconfigured";
  const alertCount = (connectivity?.alerts.length ?? 0) + (runtime?.status === "error" ? 1 : 0);
  const decision = getDecision(runtime?.status, broker?.status);
  const statusRows: StatusRow[] = [
    {
      title: "Status",
      value: runtime ? titleCase(runtime.status) : "Connecting",
      tone: runtimeTone(runtime?.status),
      detail: runtime?.reason ?? "Connecting to the lifecycle control channel.",
      icon: RadioTower,
    },
    {
      title: "KPI Live",
      value: connectivity ? `${connectivity.readinessScore}%` : "Connecting",
      tone: connectivity?.overallStatus === "online" ? "green" : connectivity?.overallStatus === "offline" ? "red" : "orange",
      detail: connectivity ? `${connectivity.overallStatus} platform readiness; ${broker?.brokerName ?? "broker"} is ${broker?.status ?? "connecting"}.` : "Loading production connectivity evidence.",
      icon: CircleGauge,
    },
    {
      title: "Decision",
      value: decision.label,
      tone: decision.tone,
      detail: decision.detail,
      icon: PauseCircle,
    },
    {
      title: "Alerts",
      value: String(alertCount),
      tone: alertCount === 0 ? "green" : "red",
      detail: alertCount === 0 ? "No active lifecycle or connectivity alerts." : `${alertCount} active lifecycle and connectivity alert${alertCount === 1 ? "" : "s"}.`,
      icon: Bell,
    },
  ];

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span><ChevronRight size={13} aria-hidden="true" /><span>Start</span><ChevronRight size={13} aria-hidden="true" /><strong>Operating Mode</strong>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <span className={styles.stageNumber}>01</span>
          <div><p className={styles.eyebrow}>Lifecycle configuration</p><h1>Operating Mode</h1></div>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.primaryTag}>START</span>
          <span>Platform Readiness</span>
          <span>System state: {runtime ? titleCase(runtime.status) : "Connecting"}</span>
          <span>Realtime: {streamMode}</span>
          <span>Last update: {formatTime(lastReceivedAt)}</span>
          <span>Audit: audit.platform-readiness.start.operating-mode</span>
        </div>
      </header>

      {lastError ? <div className={styles.emptyState} role="alert"><span><Info size={12} /></span><p>{lastError}</p></div> : null}

      <section className={styles.statusList} aria-label="Operating mode status" aria-live="polite">
        {statusRows.map(({ icon: Icon, ...row }) => (
          <article className={styles.statusRow} key={row.title}>
            <span className={`${styles.statusIcon} ${styles[row.tone]}`}><Icon size={22} aria-hidden="true" /></span>
            <div className={styles.statusIdentity}><span>{row.title}</span><strong className={styles[`${row.tone}Text`]}>{row.value}</strong></div>
            <p>{row.detail}</p>
            <button type="button" onClick={() => void refreshAll()} aria-label={`Refresh ${row.title}`}><ChevronRight size={18} /></button>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <header><span><LayoutDashboard size={20} /></span><div><h2>Primary Workspace</h2><p>Live operating mode configuration and production service bindings</p></div></header>
        <div className={styles.workspaceBody}>
          <dl>
            <div><dt>Operating mode</dt><dd><strong>{titleCase(operatingMode)}</strong></dd></div>
            <div><dt>Lifecycle state</dt><dd>{runtime ? `${titleCase(runtime.status)} / ${titleCase(runtime.currentStage)}` : "Connecting"}</dd></div>
            <div><dt>Broker binding</dt><dd>{broker ? `${broker.brokerName} · ${broker.account} · ${broker.server}` : "Loading broker evidence"}</dd></div>
            <div><dt>Live market</dt><dd>{connectivity ? `${connectivity.marketData.symbol} ${formatPrice(connectivity.marketData.bid)} / ${formatPrice(connectivity.marketData.ask)}` : "Loading market feed"}</dd></div>
            <div><dt>Decision evidence</dt><dd>{runtime?.reason ?? "Awaiting lifecycle evidence."}</dd></div>
            <div><dt>Correlation</dt><dd>{runtime?.correlationId ?? connectivity?.correlationId ?? "Not assigned"}</dd></div>
            <div><dt>Permission</dt><dd><strong>platform-readiness.start.operating-mode.view</strong></dd></div>
          </dl>

          <div className={styles.illustration} aria-hidden="true">
            <div className={styles.glow} />
            <div className={styles.serverGraphic}><Server size={102} strokeWidth={1.25} /><span className={styles.dataPulse}><Database size={22} /></span></div>
            <div className={styles.monitorGraphic}><MonitorCheck size={106} strokeWidth={1.25} /></div>
            <span className={styles.success}><Check size={16} strokeWidth={3} /></span>
          </div>
        </div>
      </section>

      <section className={styles.actions}>
        <h2>Actions</h2>
        <div className={styles.actionButtons}>
          <button type="button" onClick={() => void refreshAll()} disabled={refreshing}><RotateCw size={15} />{refreshing ? "Refreshing" : "Retry"}</button>
          <button type="button" onClick={() => void refreshAll()} disabled={refreshing}><RefreshCw size={15} />Sync</button>
          <button type="button" onClick={() => setLastError(null)}><CheckCircle2 size={15} />Acknowledge</button>
        </div>
        <div className={styles.emptyState}>
          <span><Info size={12} /></span>
          <p>{lastReceivedAt ? `Live production evidence received at ${formatTime(lastReceivedAt)} via ${streamMode === "live" ? "realtime streams" : "polling fallback"}.` : "Connecting to production lifecycle and connectivity sources."}</p>
        </div>
      </section>
    </main>
  );
}

function runtimeTone(status: LifecycleRuntimeStatus | undefined): Tone {
  if (status === "running") return "green";
  if (status === "error") return "red";
  if (status === "starting" || status === "stopping") return "purple";
  return "orange";
}

function getDecision(runtimeStatus: LifecycleRuntimeStatus | undefined, brokerStatus: string | undefined): { label: string; tone: Tone; detail: string } {
  if (runtimeStatus === "error" || brokerStatus === "offline") return { label: "Block", tone: "red", detail: "Execution remains blocked until lifecycle and broker evidence recover." };
  if (runtimeStatus === "running" && brokerStatus === "online") return { label: "Proceed", tone: "green", detail: "Lifecycle and broker evidence permit autonomous initialization." };
  return { label: "Hold", tone: "orange", detail: "Execution is held while the lifecycle is stopped or awaiting authorization." };
}

function titleCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}

function formatTime(value: string | null) {
  if (!value) return "Connecting";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
