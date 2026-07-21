"use client";

import {
  Activity,
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
import type { LifecycleSnapshot, LifecycleStatus } from "@/types/lifecycle";
import type { LifecycleControlResponse, LifecycleRuntime, LifecycleRuntimeStatus } from "@/types/lifecycle-control";
import type { StartInitializeHandoff, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";
import styles from "./start-page.module.css";

const REFRESH_INTERVAL_MS = 5000;

type StreamMode = "connecting" | "live" | "polling";
type Tone = "purple" | "green" | "orange" | "red";
type StatusCard = { label: string; value: string; tone: Tone; description: string; icon: typeof RadioTower };

export function StartPage() {
  const [runtime, setRuntime] = useState<LifecycleRuntime | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleSnapshot | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot | null>(null);
  const [handoff, setHandoff] = useState<StartInitializeHandoff | null>(null);
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
      const [runtimeResponse, lifecycleResponse, connectivityResponse, handoffResponse] = await Promise.all([
        fetch("/api/lifecycle-control", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/executive/lifecycle-command-centre", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/platform-readiness/connect", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/platform-readiness/handoff/start-initialize", { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);

      if (!runtimeResponse.ok) throw new Error(`Lifecycle control failed with ${runtimeResponse.status}`);
      if (!lifecycleResponse.ok) throw new Error(`Lifecycle snapshot failed with ${lifecycleResponse.status}`);
      if (!connectivityResponse.ok) throw new Error(`Connectivity snapshot failed with ${connectivityResponse.status}`);
      if (!handoffResponse.ok) throw new Error(`START handoff failed with ${handoffResponse.status}`);

      const runtimePayload = await runtimeResponse.json() as LifecycleControlResponse;
      const lifecyclePayload = await lifecycleResponse.json() as LifecycleSnapshot;
      const connectivityPayload = await connectivityResponse.json() as ConnectivitySnapshotResponse;
      const handoffPayload = await handoffResponse.json() as StartInitializeHandoffResponse;
      if (!mounted.current) return;
      setRuntime(runtimePayload.runtime);
      setLifecycle(lifecyclePayload);
      setConnectivity(connectivityPayload.snapshot);
      setHandoff(handoffPayload.handoff);
      setLastReceivedAt(new Date().toISOString());
      setLastError(null);
    } catch (error) {
      if (mounted.current) setLastError(error instanceof Error ? error.message : "START stage refresh failed");
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

    lifecycleStream.addEventListener("open", () => setStreamMode("live"));
    lifecycleStream.addEventListener("message", (event) => {
      try {
        setLifecycle(JSON.parse((event as MessageEvent).data) as LifecycleSnapshot);
        setLastReceivedAt(new Date().toISOString());
        setLastError(null);
        setStreamMode("live");
      } catch {
        setLastError("A realtime lifecycle event could not be decoded.");
      }
    });
    lifecycleStream.addEventListener("error", () => setStreamMode("polling"));
    connectivityStream.addEventListener("open", () => setStreamMode("live"));
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
    connectivityStream.addEventListener("error", () => setStreamMode("polling"));
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

  const startStage = lifecycle?.stages.find((stage) => stage.key === "start") ?? null;
  const stageProgress = startStage?.progress ?? 0;
  const statusCounts = countStageStatuses(lifecycle?.stages ?? []);
  const handoffAlert = handoff?.decision === "HOLD" ? 1 : 0;
  const alertCount = (connectivity?.alerts.length ?? 0) + handoffAlert + (runtime?.status === "error" ? 1 : 0);
  const decision = startDecision(runtime?.status, handoff, connectivity?.broker.status);
  const statusCards: StatusCard[] = [
    { label: "Status", value: runtime ? titleCase(runtime.status) : "Connecting", tone: runtimeTone(runtime?.status), description: runtime?.reason ?? "Connecting to lifecycle control.", icon: RadioTower },
    { label: "KPI Live", value: connectivity ? `${connectivity.readinessScore}%` : "Connecting", tone: connectivity?.overallStatus === "online" ? "green" : connectivity?.overallStatus === "offline" ? "red" : "orange", description: connectivity ? `${connectivity.services.filter((service) => service.status === "online").length}/${connectivity.services.length} production services online.` : "Loading connectivity evidence.", icon: CircleGauge },
    { label: "Decision", value: decision.label, tone: decision.tone, description: decision.detail, icon: PauseCircle },
    { label: "Alerts", value: String(alertCount), tone: alertCount === 0 ? "green" : "red", description: alertCount === 0 ? "No active START or connectivity alerts." : `${alertCount} active START and connectivity alert${alertCount === 1 ? "" : "s"}.`, icon: Bell },
  ];

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><span>Platform Readiness</span><ChevronRight size={13} aria-hidden="true" /><strong>Start</strong></nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}><span className={styles.stageNumber}>01</span><div><p className={styles.eyebrow}>Lifecycle stage</p><h1>Start</h1></div></div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>START</span><span>Platform Readiness</span>
            <span>System State: {runtime ? titleCase(runtime.status) : "Connecting"}</span>
            <span>Realtime: {streamMode}</span>
            <span>Last Update: {formatTime(lastReceivedAt)}</span>
            <span>Audit: Health Platform Readiness Start</span>
          </div>
        </div>
        <div className={`${styles.stageStatus} ${styles[stageStatusTone(startStage?.status)]}`}><small>Stage Status</small><strong><i />{startStage ? titleCase(startStage.status) : "Connecting"}</strong></div>
      </header>

      {lastError ? <div className={styles.emptyState} role="alert"><span><Info size={12} /></span><p>{lastError}</p></div> : null}

      <div className={styles.pageGrid}>
        <section className={styles.mainColumn} aria-label="Start stage workspace">
          <div className={styles.statusGrid} aria-live="polite">
            {statusCards.map(({ icon: Icon, ...card }) => (
              <article className={styles.statusCard} key={card.label}>
                <div className={styles.cardTopRow}><span className={`${styles.statusIcon} ${styles[card.tone]}`}><Icon size={21} aria-hidden="true" /></span><button type="button" onClick={() => void refreshAll()} aria-label={`Refresh ${card.label}`}><ChevronRight size={17} /></button></div>
                <small>{card.label}</small><strong className={styles[`${card.tone}Text`]}>{card.value}</strong><p>{card.description}</p>
              </article>
            ))}
          </div>

          <article className={styles.workspace}>
            <header className={styles.workspaceHeader}><span><LayoutDashboard size={20} /></span><div><h2>Primary Workspace</h2><p>Live production service readiness and START handoff status</p></div></header>
            <div className={styles.workspaceBody}>
              <dl className={styles.workspaceDetails}>
                <div><dt>Operating mode</dt><dd><strong>{titleCase(connectivity?.broker.tradeMode ?? "unconfigured")}</strong></dd></div>
                <div><dt>Broker binding</dt><dd>{connectivity ? `${connectivity.broker.brokerName} · ${connectivity.broker.account} · ${connectivity.broker.status}` : "Loading broker evidence"}</dd></div>
                <div><dt>Live market</dt><dd>{connectivity ? `${connectivity.marketData.symbol} ${formatPrice(connectivity.marketData.bid)} / ${formatPrice(connectivity.marketData.ask)}` : "Loading market feed"}</dd></div>
                <div><dt>START handoff</dt><dd>{handoff ? `${handoff.decision} · ${handoff.inputs.checklist.passed}/${handoff.inputs.checklist.required} checks passed` : "No handoff published"}</dd></div>
                <div><dt>Decision evidence</dt><dd>{runtime?.reason ?? "Awaiting lifecycle evidence."}</dd></div>
                <div><dt>Correlation</dt><dd>{handoff?.correlationId ?? runtime?.correlationId ?? connectivity?.correlationId ?? "Not assigned"}</dd></div>
                <div><dt>Permission</dt><dd><strong>platform-readiness.start.view</strong></dd></div>
              </dl>
              <div className={styles.illustration} aria-hidden="true"><div className={styles.illustrationGlow} /><div className={styles.serverGraphic}><Server size={96} strokeWidth={1.25} /><span className={styles.dataPulse}><Database size={22} /></span></div><div className={styles.monitorGraphic}><MonitorCheck size={100} strokeWidth={1.25} /></div><span className={styles.successCheck}><Check size={16} strokeWidth={3} /></span></div>
            </div>
          </article>

          <article className={styles.actionsCard}>
            <h2>Actions</h2>
            <div className={styles.actionButtons}>
              <button type="button" onClick={() => void refreshAll()} disabled={refreshing}><RotateCw size={15} />{refreshing ? "Refreshing" : "Retry"}</button>
              <button type="button" onClick={() => void refreshAll()} disabled={refreshing}><RefreshCw size={15} />Sync</button>
              <button type="button" onClick={() => setLastError(null)}><CheckCircle2 size={15} />Acknowledge</button>
            </div>
            <div className={styles.emptyState}><span><Info size={12} /></span><p>{lastReceivedAt ? `Live production evidence received at ${formatTime(lastReceivedAt)} via ${streamMode === "live" ? "realtime streams" : "polling fallback"}.` : "Connecting to production lifecycle, handoff, and connectivity sources."}</p></div>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <h3>Stage Progress</h3>
            <div className={styles.progressRing} style={{ background: `conic-gradient(#6b3fe5 ${stageProgress * 3.6}deg, #eeeafd 0deg)` }}><div><strong>{stageProgress}%</strong><span>Complete</span></div></div>
            <ul className={styles.progressLegend}>
              <li><i className={styles.completedDot} /><span>Completed</span><b>{statusCounts.completed}</b></li>
              <li><i className={styles.inProgressDot} /><span>In Progress</span><b>{statusCounts.inProgress}</b></li>
              <li><i className={styles.pendingDot} /><span>Pending</span><b>{statusCounts.pending}</b></li>
              <li><i className={styles.blockedDot} /><span>Blocked</span><b>{statusCounts.blocked}</b></li>
            </ul>
          </article>

          <article className={styles.railCard}>
            <h3>Stage Information</h3>
            <dl className={styles.stageInformation}>
              <div><dt>Stage Name</dt><dd>{startStage?.name ?? "Start"}</dd></div><div><dt>Stage Order</dt><dd>1 of {lifecycle?.stages.length ?? 17}</dd></div><div><dt>Group</dt><dd>{startStage?.group ?? "Platform Readiness"}</dd></div><div><dt>Dependencies</dt><dd>None</dd></div><div><dt>Est. Duration</dt><dd>{startStage?.estimatedCompletion ?? "—"}</dd></div><div><dt>Automated</dt><dd><span className={styles.automatedBadge}>Yes</span></dd></div>
            </dl>
          </article>

          <article className={styles.railCard}>
            <h3>Recent Activity</h3>
            <div className={styles.activityList}>
              {(lifecycle?.activity ?? []).slice(0, 5).map((item, index, items) => <div className={styles.activityItem} key={item.id}><span className={styles.activityIcon}><Activity size={12} /></span><p>{item.message}</p><time>{item.time}</time>{index < items.length - 1 ? <i /> : null}</div>)}
              {!lifecycle?.activity.length ? <div className={styles.emptyState}><p>Waiting for lifecycle activity.</p></div> : null}
            </div>
            <button className={styles.viewActivityButton} type="button" onClick={() => void refreshAll()}>Refresh Activity<ChevronRight size={13} /></button>
          </article>
        </aside>
      </div>
    </main>
  );
}

function runtimeTone(status: LifecycleRuntimeStatus | undefined): Tone {
  if (status === "running") return "green";
  if (status === "error") return "red";
  if (status === "starting" || status === "stopping") return "purple";
  return "orange";
}

function startDecision(runtimeStatus: LifecycleRuntimeStatus | undefined, handoff: StartInitializeHandoff | null, brokerStatus: string | undefined): { label: string; tone: Tone; detail: string } {
  if (runtimeStatus === "error" || brokerStatus === "offline") return { label: "Block", tone: "red", detail: "START remains blocked until lifecycle and broker evidence recover." };
  if (handoff?.decision === "AUTHORIZED") return { label: "Authorized", tone: "green", detail: "START evidence is complete and the INITIALIZE handoff is authorized." };
  if (handoff?.decision === "HOLD") return { label: "Hold", tone: "orange", detail: `START handoff is held with ${handoff.inputs.checklist.passed}/${handoff.inputs.checklist.required} checks passed.` };
  return { label: "Hold", tone: "orange", detail: "START is waiting for a production assessment and authorization envelope." };
}

function stageStatusTone(status: LifecycleStatus | undefined) {
  if (status === "completed") return "stageGreen";
  if (status === "failed" || status === "blocked") return "stageRed";
  if (status === "in-progress") return "stagePurple";
  return "stageOrange";
}

function countStageStatuses(stages: LifecycleSnapshot["stages"]) {
  return stages.reduce((counts, stage) => {
    if (stage.status === "completed") counts.completed += 1;
    else if (stage.status === "in-progress") counts.inProgress += 1;
    else if (stage.status === "blocked" || stage.status === "failed") counts.blocked += 1;
    else counts.pending += 1;
    return counts;
  }, { completed: 0, inProgress: 0, pending: 0, blocked: 0 });
}

function titleCase(value: string) { return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatPrice(value: number | null | undefined) { return typeof value === "number" ? value.toFixed(2) : "n/a"; }
function formatTime(value: string | null) { return value ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "Connecting"; }
