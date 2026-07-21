"use client";

import {
  AlertTriangle,
  Bot,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  CloudCog,
  Cpu,
  FileClock,
  FileJson2,
  Gauge,
  GitBranch,
  LockKeyhole,
  Network,
  RefreshCw,
  ScrollText,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InitializationSnapshot, InitializationStatus } from "@/types/initialization";
import styles from "./initialize-page.module.css";

type InitStatus = InitializationStatus;

type InitStep = {
  id: string;
  title: string;
  description: string;
  route: string;
  status: InitStatus;
  icon: typeof Settings2;
  required: number;
};

const initialSteps: InitStep[] = [
  { id: "configuration", title: "Configuration Loading", description: "Load environment, trading, strategy, risk, and lifecycle configuration.", route: "/platform-readiness/initialize/configuration-loading", status: "pending", icon: FileJson2, required: 5 },
  { id: "engines", title: "Engine Initialization", description: "Initialize lifecycle, analysis, risk, execution, and learning engines.", route: "/platform-readiness/initialize/engine-initialization", status: "pending", icon: Cpu, required: 5 },
  { id: "agents", title: "AI Agent Initialization", description: "Register autonomous agents, authorities, tools, policies, and memory.", route: "/platform-readiness/initialize/ai-agent-initialization", status: "pending", icon: BrainCircuit, required: 11 },
  { id: "services", title: "Service Initialization", description: "Prepare database, market, news, messaging, audit, and scheduler services.", route: "/platform-readiness/initialize/service-initialization", status: "pending", icon: ServerCog, required: 6 },
  { id: "dependencies", title: "Dependency Monitor", description: "Resolve required service dependencies and startup ordering constraints.", route: "/platform-readiness/initialize/dependency-monitor", status: "pending", icon: GitBranch, required: 8 },
  { id: "audit", title: "Initialization Audit", description: "Seal initialization evidence, decisions, failures, and retry schedule.", route: "/platform-readiness/initialize/initialization-logs", status: "pending", icon: ScrollText, required: 1 },
];

const statusLabel: Record<InitStatus, string> = { pending: "Pending", running: "Initializing", ready: "Ready", blocked: "Blocked" };

const engineGroups = [
  ["Lifecycle Engine", "State transitions and orchestration", Workflow],
  ["Market Intelligence", "Analysis and market interpretation", Sparkles],
  ["Risk Authority", "Independent controls and veto", ShieldCheck],
  ["Execution Engine", "Order routing and reconciliation", Zap],
  ["Learning Engine", "Review, memory, and optimization", BrainCircuit],
] as const;

export function InitializePage() {
  const [snapshot, setSnapshot] = useState<InitializationSnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<"connecting" | "live" | "polling">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const refreshPending = useRef(false);
  const mounted = useRef(true);
  const streamLive = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    try {
      const response = await fetch("/api/platform-readiness/initialize", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Initialization snapshot failed with ${response.status}`);
      const payload = await response.json() as InitializationSnapshot;
      if (!mounted.current) return;
      setSnapshot(payload);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Initialization snapshot unavailable.");
    } finally {
      refreshPending.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let stream: EventSource | null = null;
    let reconnectTimer: number | null = null;
    const connect = () => {
      if (!mounted.current) return;
      const next = new EventSource("/api/platform-readiness/initialize/stream");
      stream = next;
      next.addEventListener("open", () => { streamLive.current = true; setStreamMode("live"); });
      next.addEventListener("snapshot", (event) => {
        try {
          setSnapshot(JSON.parse((event as MessageEvent).data) as InitializationSnapshot);
          setError(null);
          setStreamMode("live");
        } catch {
          setError("A realtime initialization snapshot could not be decoded.");
        }
      });
      next.addEventListener("error", () => {
        if (stream === next) stream = null;
        streamLive.current = false;
        next.close();
        setStreamMode("polling");
        if (mounted.current && reconnectTimer === null) reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 3000);
      });
    };
    const pollTimer = window.setInterval(() => { if (!streamLive.current) void refresh(); }, 5000);
    const handleRuntimeUpdate = () => void refresh();
    window.addEventListener("lifecycle-runtime-updated", handleRuntimeUpdate);
    connect();
    void refresh();
    return () => {
      mounted.current = false;
      streamLive.current = false;
      stream?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("lifecycle-runtime-updated", handleRuntimeUpdate);
    };
  }, [refresh]);

  const steps = initialSteps.map((step) => {
    const evidence = snapshot?.steps.find((item) => item.id === step.id);
    return { ...step, status: evidence?.status ?? "pending" as InitStatus, ready: evidence?.ready ?? 0, required: evidence?.required ?? step.required, evidence: evidence?.evidence ?? "Connecting to initialization evidence." };
  });
  const handoff = snapshot?.handoff ?? null;
  const runtime = snapshot?.runtime ?? null;
  const handoffAuthorized = snapshot?.handoffAuthorized ?? false;
  const running = steps.some((step) => step.status === "running");
  const cycle = snapshot?.cycle ?? 0;
  const message = error ?? (snapshot?.message !== dismissedMessage ? snapshot?.message ?? null : null);

  const counts = useMemo(() => ({
    ready: steps.filter((step) => step.status === "ready").length,
    running: steps.filter((step) => step.status === "running").length,
    blocked: steps.filter((step) => step.status === "blocked").length,
    pending: steps.filter((step) => step.status === "pending").length,
  }), [steps]);
  const assessmentProgress = snapshot?.progress ?? 0;
  const canAdvance = snapshot?.canAdvance ?? false;

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><span>Platform Readiness</span><ChevronRight size={13} /><strong>Initialize</strong></nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}><span className={styles.stageNumber}>02</span><div><p>Autonomous lifecycle stage</p><h1>Initialize</h1></div></div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>INITIALIZE</span><span>Mode: Fully Autonomous</span><span>Owner: Lifecycle Orchestrator</span><span>Policy: Ordered · Idempotent · Fail Closed</span><span>Realtime: {streamMode}</span><span>Updated: {formatTime(snapshot?.updatedAt)}</span><span>Audit: audit.platform-readiness.initialize</span>
          </div>
        </div>
        <div className={`${styles.stageStatus} ${canAdvance ? styles.stageReady : ""}`}><small>Stage Decision</small><strong>{canAdvance ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}{snapshot?.decision === "ADVANCE" ? "Advance to CONNECT" : snapshot?.decision === "INITIALIZING" ? "Initializing" : "Hold"}</strong></div>
      </header>

      <section className={`${styles.handoffGate} ${handoffAuthorized ? styles.handoffAuthorized : ""}`}>
        <div className={styles.handoffIdentity}>{handoffAuthorized ? <CheckCircle2 size={20} /> : <LockKeyhole size={20} />}<span><small>STAGE 1 → STAGE 2 HANDOFF</small><strong>{error ? "Handoff channel unavailable" : !snapshot ? "Loading START evidence" : runtime?.status === "stopped" ? "Lifecycle stopped" : !handoff ? "No START handoff published" : `${runtime?.status.toUpperCase()} · ${handoff.decision} · sequence ${handoff.sequence}`}</strong></span></div>
        <div className={styles.handoffInputs}><span><small>Operating mode</small><b>{handoff?.inputs.operatingMode.state ?? "unavailable"}</b></span><span><small>Trading profile</small><b>{handoff?.inputs.tradingProfile.state ?? "unavailable"}</b></span><span><small>Risk profile</small><b>{handoff?.inputs.riskProfile.state ?? "unavailable"}</b></span><span><small>Checklist</small><b>{handoff ? `${handoff.inputs.checklist.passed}/${handoff.inputs.checklist.required} required passed` : "not received"}</b></span></div>
        <div className={styles.handoffAudit}><small>Correlation ID</small><strong>{handoff?.correlationId ?? "Not issued"}</strong><span>{handoff ? `SHA-256 ${handoff.integrity.digest.slice(0, 12)}…` : "Integrity pending"}</span></div>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.purple}`}><Workflow size={21} /></span><div><small>Initialization Cycle</small><strong>#{cycle}</strong><p>{running ? "Production initialization active" : handoffAuthorized ? "Authorized handoff available" : "Gated by START decision"}</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.green}`}><CheckCircle2 size={21} /></span><div><small>Ready Components</small><strong>{counts.ready}/{steps.length}</strong><p>Required stage groups</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.orange}`}><Gauge size={21} /></span><div><small>Assessment</small><strong>{assessmentProgress}%</strong><p>{counts.running} currently initializing</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.red}`}><AlertTriangle size={21} /></span><div><small>Blocked Groups</small><strong>{counts.blocked}</strong><p>Fail-closed dependencies</p></div></article>
      </section>

      <div className={styles.pageGrid}>
        <section className={styles.mainColumn}>
          <article className={styles.pipelineCard}>
            <header className={styles.cardHeader}>
              <div className={styles.cardTitle}><span><Boxes size={19} /></span><div><h2>Autonomous Initialization Pipeline</h2><p>Every component initializes in dependency order with evidence and automatic retry.</p></div></div>
              <div className={styles.automationBadge}><i /><Bot size={14} />{streamMode === "live" ? "Live evidence stream" : streamMode === "polling" ? "5s polling fallback" : "Connecting"}</div>
            </header>
            {message ? <div className={styles.message}><AlertTriangle size={15} /><span>{message}</span><button type="button" onClick={() => setDismissedMessage(message)} aria-label="Dismiss"><X size={14} /></button></div> : null}
            <div className={styles.stepList}>
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <a className={`${styles.stepRow} ${styles[`row_${step.status}`]}`} href={step.route} key={step.id}>
                    <span className={styles.stepOrder}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.stepIcon}><Icon size={18} /></span>
                    <span className={styles.stepIdentity}><strong>{step.title}</strong><small>{step.evidence}</small></span>
                    <span className={styles.requirement}>{step.ready}/{step.required} ready</span>
                    <span className={`${styles.statusBadge} ${styles[`status_${step.status}`]}`}>{stepStatusIcon(step.status)}{statusLabel[step.status]}</span>
                    <ChevronRight size={16} />
                  </a>
                );
              })}
            </div>
          </article>

          <article className={styles.topologyCard}>
            <header className={styles.cardHeader}><div className={styles.cardTitle}><span><Network size={19} /></span><div><h2>Engine Topology</h2><p>Autonomous authorities are isolated by responsibility and connected through audited events.</p></div></div></header>
            <div className={styles.engineGrid}>{engineGroups.map(([title, detail, Icon]) => <div className={styles.engine} key={title}><span><Icon size={20} /></span><div><strong>{title}</strong><small>{detail}</small></div><b>{engineState(snapshot, title)}</b></div>)}</div>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <div className={styles.railTitle}><h3>Stage Progress</h3><span>{assessmentProgress}%</span></div>
            <div className={styles.progressRing} style={{ "--progress": `${assessmentProgress * 3.6}deg` } as React.CSSProperties}><div><strong>{assessmentProgress}%</strong><small>Assessed</small></div></div>
            <ul className={styles.legend}><li><i className={styles.dotReady} /><span>Ready</span><b>{counts.ready}</b></li><li><i className={styles.dotRunning} /><span>Initializing</span><b>{counts.running}</b></li><li><i className={styles.dotPending} /><span>Pending</span><b>{counts.pending}</b></li><li><i className={styles.dotBlocked} /><span>Blocked</span><b>{counts.blocked}</b></li></ul>
          </article>

          <article className={styles.railCard}>
            <h3>Lifecycle Orchestrator</h3>
            <div className={styles.orchestrator}><span><CloudCog size={25} /></span><div><strong>Initialization AI</strong><small>Continuous · idempotent</small></div></div>
            <dl className={styles.railDetails}><div><dt>Current action</dt><dd>{running ? "Initializing" : "Monitoring"}</dd></div><div><dt>Stage outcome</dt><dd className={canAdvance ? styles.good : styles.hold}>{snapshot?.decision ?? "CONNECTING"}</dd></div><div><dt>Connectivity</dt><dd>{snapshot ? `${snapshot.connectivityScore}%` : "—"}</dd></div><div><dt>Manual approval</dt><dd>Not required</dd></div><div><dt>Unsafe bypass</dt><dd>Prohibited</dd></div></dl>
          </article>

          <article className={styles.railCard}>
            <h3>Autonomous Activity</h3>
            <div className={styles.timeline}>{(snapshot?.activity ?? []).map((item) => <div key={item.id}><i /><p>{item.message}</p><time>{formatTime(item.timestamp)}</time></div>)}{!snapshot?.activity.length ? <div><i /><p>Connecting to initialization activity.</p><time>Pending</time></div> : null}</div>
            <div className={styles.auditNote}><FileClock size={14} /><span>Live snapshots are correlated with lifecycle and START handoff evidence.</span></div>
          </article>
        </aside>
      </div>
    </main>
  );
}

function stepStatusIcon(status: InitStatus) {
  if (status === "ready") return <CheckCircle2 size={13} />;
  if (status === "running") return <RefreshCw className={styles.spinning} size={13} />;
  if (status === "blocked") return <X size={13} />;
  return <Circle size={13} />;
}

function engineState(snapshot: InitializationSnapshot | null, title: string) {
  if (!snapshot) return "Connecting";
  if (title === "Lifecycle Engine") return snapshot.runtime.status === "running" && snapshot.runtime.currentStage === "initialize" ? "Active" : "Stopped";
  const engines = snapshot.steps.find((step) => step.id === "engines");
  if (engines?.status === "ready") return "Ready";
  if (engines?.status === "running") return "Starting";
  if (engines?.status === "blocked") return "Adapter held";
  return "Waiting";
}

function formatTime(value?: string | null) {
  if (!value) return "--:--:--";
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}
