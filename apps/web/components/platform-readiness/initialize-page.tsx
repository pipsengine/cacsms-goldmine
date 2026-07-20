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
import type { StartInitializeHandoff, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";
import styles from "./initialize-page.module.css";

type InitStatus = "pending" | "running" | "ready" | "blocked";

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
  const [steps, setSteps] = useState(initialSteps);
  const [cycle, setCycle] = useState(0);
  const [nextRetry, setNextRetry] = useState(90);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<StartInitializeHandoff | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<"loading" | "received" | "absent" | "error">("loading");
  const timers = useRef<number[]>([]);
  const retryRef = useRef(90);

  const runInitialization = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    retryRef.current = 90;
    setNextRetry(90);
    setCycle((value) => value + 1);
    setRunning(true);
    setMessage(null);
    setSteps((current) => current.map((step) => ({ ...step, status: "pending" })));

    initialSteps.forEach((step, index) => {
      const start = window.setTimeout(() => setSteps((current) => current.map((item) => item.id === step.id ? { ...item, status: "running" } : item)), index * 180);
      const finish = window.setTimeout(() => {
        setSteps((current) => current.map((item) => item.id === step.id ? { ...item, status: "blocked" } : item));
        if (index === initialSteps.length - 1) {
          setRunning(false);
          setMessage("Initialization cycle completed safely. Required production adapters are unavailable; INITIALIZE remains locked and autonomous retry is scheduled.");
        }
      }, index * 180 + 650);
      timers.current.push(start, finish);
    });
  }, []);

  const refreshHandoff = useCallback(async () => {
    try {
      const response = await fetch("/api/platform-readiness/handoff/start-initialize", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Handoff request failed with ${response.status}`);
      const payload = await response.json() as StartInitializeHandoffResponse;
      setHandoff(payload.handoff);
      setHandoffStatus(payload.handoff ? "received" : "absent");
    } catch {
      setHandoff(null);
      setHandoffStatus("error");
    }
  }, []);

  useEffect(() => {
    void refreshHandoff();
    const pollTimer = window.setInterval(refreshHandoff, 3000);
    return () => window.clearInterval(pollTimer);
  }, [refreshHandoff]);

  const handoffAuthorized = Boolean(handoff && handoff.decision === "AUTHORIZED" && Date.parse(handoff.expiresAt) > Date.now());
  const authorizedHandoffId = handoffAuthorized ? handoff?.handoffId ?? null : null;

  useEffect(() => {
    if (!authorizedHandoffId) {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      setRunning(false);
      setSteps((current) => current.map((step) => ({ ...step, status: "blocked" })));
      setMessage(handoffStatus === "loading" ? null : handoff?.decision === "HOLD" ? `START handoff ${handoff.correlationId} was received with HOLD. INITIALIZE will not execute until START publishes complete production evidence.` : "No valid START authorization handoff is available. INITIALIZE remains fail-closed and continues monitoring automatically.");
      return;
    }
    runInitialization();
    const retryTimer = window.setInterval(() => {
      const next = retryRef.current - 1;
      if (next <= 0) runInitialization();
      else { retryRef.current = next; setNextRetry(next); }
    }, 1000);
    return () => {
      window.clearInterval(retryTimer);
      timers.current.forEach(window.clearTimeout);
    };
  }, [authorizedHandoffId, handoff?.correlationId, handoff?.decision, handoffStatus, runInitialization]);

  const counts = useMemo(() => ({
    ready: steps.filter((step) => step.status === "ready").length,
    running: steps.filter((step) => step.status === "running").length,
    blocked: steps.filter((step) => step.status === "blocked").length,
    pending: steps.filter((step) => step.status === "pending").length,
  }), [steps]);
  const checked = counts.ready + counts.blocked;
  const assessmentProgress = Math.round((checked / steps.length) * 100);
  const canAdvance = handoffAuthorized && steps.every((step) => step.status === "ready");

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><span>Platform Readiness</span><ChevronRight size={13} /><strong>Initialize</strong></nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}><span className={styles.stageNumber}>02</span><div><p>Autonomous lifecycle stage</p><h1>Initialize</h1></div></div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>INITIALIZE</span><span>Mode: Fully Autonomous</span><span>Owner: Lifecycle Orchestrator</span><span>Policy: Ordered · Idempotent · Fail Closed</span><span>Audit: audit.platform-readiness.initialize</span>
          </div>
        </div>
        <div className={`${styles.stageStatus} ${canAdvance ? styles.stageReady : ""}`}><small>Stage Decision</small><strong>{canAdvance ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}{canAdvance ? "Advance to CONNECT" : running ? "Initializing" : handoff?.decision === "HOLD" ? "START handoff held" : "Awaiting START"}</strong></div>
      </header>

      <section className={`${styles.handoffGate} ${handoffAuthorized ? styles.handoffAuthorized : ""}`}>
        <div className={styles.handoffIdentity}>{handoffAuthorized ? <CheckCircle2 size={20} /> : <LockKeyhole size={20} />}<span><small>STAGE 1 → STAGE 2 HANDOFF</small><strong>{handoffStatus === "loading" ? "Loading START evidence" : handoffStatus === "error" ? "Handoff channel unavailable" : handoffStatus === "absent" ? "No START handoff published" : `${handoff?.decision} · sequence ${handoff?.sequence}`}</strong></span></div>
        <div className={styles.handoffInputs}><span><small>Operating mode</small><b>{handoff?.inputs.operatingMode.state ?? "unavailable"}</b></span><span><small>Trading profile</small><b>{handoff?.inputs.tradingProfile.state ?? "unavailable"}</b></span><span><small>Risk profile</small><b>{handoff?.inputs.riskProfile.state ?? "unavailable"}</b></span><span><small>Checklist</small><b>{handoff ? `${handoff.inputs.checklist.passed}/${handoff.inputs.checklist.required} required passed` : "not received"}</b></span></div>
        <div className={styles.handoffAudit}><small>Correlation ID</small><strong>{handoff?.correlationId ?? "Not issued"}</strong><span>{handoff ? `SHA-256 ${handoff.integrity.digest.slice(0, 12)}…` : "Integrity pending"}</span></div>
      </section>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.purple}`}><Workflow size={21} /></span><div><small>Initialization Cycle</small><strong>#{cycle}</strong><p>{running ? "Autonomous sequence active" : handoffAuthorized ? `Retry in ${nextRetry}s` : "Gated by START decision"}</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.green}`}><CheckCircle2 size={21} /></span><div><small>Ready Components</small><strong>{counts.ready}/{steps.length}</strong><p>Required stage groups</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.orange}`}><Gauge size={21} /></span><div><small>Assessment</small><strong>{assessmentProgress}%</strong><p>{counts.running} currently initializing</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.red}`}><AlertTriangle size={21} /></span><div><small>Blocked Groups</small><strong>{counts.blocked}</strong><p>Fail-closed dependencies</p></div></article>
      </section>

      <div className={styles.pageGrid}>
        <section className={styles.mainColumn}>
          <article className={styles.pipelineCard}>
            <header className={styles.cardHeader}>
              <div className={styles.cardTitle}><span><Boxes size={19} /></span><div><h2>Autonomous Initialization Pipeline</h2><p>Every component initializes in dependency order with evidence and automatic retry.</p></div></div>
              <div className={styles.automationBadge}><i /><Bot size={14} />{running ? "Orchestrating now" : `Monitoring · retry ${nextRetry}s`}</div>
            </header>
            {message ? <div className={styles.message}><AlertTriangle size={15} /><span>{message}</span><button type="button" onClick={() => setMessage(null)} aria-label="Dismiss"><X size={14} /></button></div> : null}
            <div className={styles.stepList}>
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <a className={`${styles.stepRow} ${styles[`row_${step.status}`]}`} href={step.route} key={step.id}>
                    <span className={styles.stepOrder}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.stepIcon}><Icon size={18} /></span>
                    <span className={styles.stepIdentity}><strong>{step.title}</strong><small>{step.description}</small></span>
                    <span className={styles.requirement}>{step.required} required</span>
                    <span className={`${styles.statusBadge} ${styles[`status_${step.status}`]}`}>{stepStatusIcon(step.status)}{statusLabel[step.status]}</span>
                    <ChevronRight size={16} />
                  </a>
                );
              })}
            </div>
          </article>

          <article className={styles.topologyCard}>
            <header className={styles.cardHeader}><div className={styles.cardTitle}><span><Network size={19} /></span><div><h2>Engine Topology</h2><p>Autonomous authorities are isolated by responsibility and connected through audited events.</p></div></div></header>
            <div className={styles.engineGrid}>{engineGroups.map(([title, detail, Icon]) => <div className={styles.engine} key={title}><span><Icon size={20} /></span><div><strong>{title}</strong><small>{detail}</small></div><b>Unbound</b></div>)}</div>
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
            <dl className={styles.railDetails}><div><dt>Current action</dt><dd>{running ? "Initializing" : "Monitoring"}</dd></div><div><dt>Stage outcome</dt><dd className={canAdvance ? styles.good : styles.hold}>{canAdvance ? "READY" : "HOLD"}</dd></div><div><dt>Next retry</dt><dd>{nextRetry}s</dd></div><div><dt>Manual approval</dt><dd>Not required</dd></div><div><dt>Unsafe bypass</dt><dd>Prohibited</dd></div></dl>
          </article>

          <article className={styles.railCard}>
            <h3>Autonomous Activity</h3>
            <div className={styles.timeline}><div><i /><p>Initialization cycle #{cycle} created</p><time>Current</time></div><div><i /><p>Dependency order resolved</p><time>Automatic</time></div><div><i /><p>Fail-closed policy applied</p><time>Automatic</time></div><div><i /><p>{running ? "Component initialization running" : "Retry schedule published"}</p><time>Live</time></div></div>
            <div className={styles.auditNote}><FileClock size={14} /><span>Every attempt, dependency, decision, and failure is retained automatically.</span></div>
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
