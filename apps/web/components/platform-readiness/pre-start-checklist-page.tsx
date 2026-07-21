"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  Cable,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  Cpu,
  Database,
  FileClock,
  Landmark,
  ListFilter,
  LockKeyhole,
  Radio,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  UserRoundCog,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StartCheckEvidence, StartInitializeHandoff } from "@/types/platform-readiness-handoff";
import styles from "./pre-start-checklist-page.module.css";

type CheckStatus = "pending" | "running" | "passed" | "warning" | "blocked";
type Filter = "all" | "required" | "issues";

type ChecklistItem = {
  id: string;
  category: string;
  label: string;
  description: string;
  required: boolean;
  status: CheckStatus;
  icon: typeof Database;
};

type PreStartAssessmentResponse = {
  schemaVersion: "pre-start-assessment/v1";
  cycleNumber: number;
  validatedAt: string;
  checks: StartCheckEvidence[];
  handoff: StartInitializeHandoff;
};

const REFRESH_INTERVAL_SECONDS = 5;

const initialItems: ChecklistItem[] = [
  { id: "database", category: "Core Services", label: "Production database", description: "Validate the primary database connection and migration state.", required: true, status: "pending", icon: Database },
  { id: "messaging", category: "Core Services", label: "Real-time messaging", description: "Confirm lifecycle events and operational channels are available.", required: true, status: "pending", icon: Radio },
  { id: "agents", category: "Core Services", label: "AI agent registry", description: "Verify required governed agent manifests are registered for INITIALIZE.", required: true, status: "pending", icon: Bot },
  { id: "operating-mode", category: "Trading Configuration", label: "Operating mode", description: "Confirm demo, simulation, prop-firm, or live operating state.", required: true, status: "pending", icon: Settings2 },
  { id: "trading-profile", category: "Trading Configuration", label: "Trading profile", description: "Validate the active XAUUSD trading profile and session policy.", required: true, status: "pending", icon: UserRoundCog },
  { id: "risk-profile", category: "Trading Configuration", label: "Risk profile", description: "Confirm account, basket, daily, and weekly risk boundaries.", required: true, status: "pending", icon: ShieldCheck },
  { id: "broker", category: "Market & Account", label: "Broker and MT5 bridge", description: "Validate broker connectivity, permissions, and terminal state.", required: true, status: "pending", icon: Cable },
  { id: "symbol", category: "Market & Account", label: "Gold symbol specification", description: "Confirm XAUUSD contract, tick, spread, and volume rules.", required: true, status: "pending", icon: CandlestickChart },
  { id: "market-data", category: "Market & Account", label: "Market data freshness", description: "Check tick delivery, candle history, and data staleness limits.", required: true, status: "pending", icon: Activity },
  { id: "account", category: "Market & Account", label: "Account eligibility", description: "Reconcile balance, equity, margin, positions, and pending orders.", required: true, status: "pending", icon: Landmark },
  { id: "news", category: "Safety Controls", label: "News restrictions", description: "Load the economic calendar and validate event blackout windows.", required: false, status: "pending", icon: TriangleAlert },
  { id: "emergency", category: "Safety Controls", label: "Emergency protection", description: "Verify stop, cancel, close, and recovery controls are reachable.", required: true, status: "pending", icon: LockKeyhole },
];

const statusLabels: Record<CheckStatus, string> = {
  pending: "Pending",
  running: "Checking",
  passed: "Passed",
  warning: "Warning",
  blocked: "Blocked",
};

export function PreStartChecklistPage() {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["database"]));
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [nextCycleIn, setNextCycleIn] = useState(REFRESH_INTERVAL_SECONDS);
  const [cycleNumber, setCycleNumber] = useState(0);
  const [handoff, setHandoff] = useState<StartInitializeHandoff | null>(null);
  const [handoffState, setHandoffState] = useState<"waiting" | "publishing" | "published" | "error">("waiting");
  const nextCycleRef = useRef(REFRESH_INTERVAL_SECONDS);
  const productionRunPending = useRef(false);
  const lastAutomaticRunAt = useRef(0);
  const [validatedAt, setValidatedAt] = useState<string | null>(null);

  const counts = useMemo(() => {
    const count = (status: CheckStatus) => items.filter((item) => item.status === status).length;
    return { passed: count("passed"), running: count("running"), warning: count("warning"), blocked: count("blocked"), pending: count("pending") };
  }, [items]);

  const progress = Math.round((counts.passed / items.length) * 100);
  const requiredIssues = items.filter((item) => item.required && (item.status === "blocked" || item.status === "warning")).length;
  const canStart = items.filter((item) => item.required).every((item) => item.status === "passed");
  const categories = Array.from(new Set(items.map((item) => item.category)));

  const visibleItems = (category: string) => items.filter((item) => {
    if (item.category !== category) return false;
    if (filter === "required") return item.required;
    if (filter === "issues") return item.status === "blocked" || item.status === "warning";
    return true;
  });

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runProductionChecks = useCallback(async (foreground = false) => {
    if (productionRunPending.current) return;
    const now = Date.now();
    if (!foreground && now - lastAutomaticRunAt.current < 4500) return;
    if (!foreground) lastAutomaticRunAt.current = now;
    productionRunPending.current = true;
    if (foreground) {
      setRunMessage(null);
      setIsRunning(true);
      setHandoffState("publishing");
      setItems((current) => current.map((item) => ({ ...item, status: "running" })));
    }
    nextCycleRef.current = REFRESH_INTERVAL_SECONDS;
    setNextCycleIn(REFRESH_INTERVAL_SECONDS);

    try {
      const response = await fetch(`/api/platform-readiness/pre-start-assessment${foreground ? "?force=1" : ""}`, {
        method: "POST",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Production assessment failed with ${response.status}`);
      const payload = await response.json() as PreStartAssessmentResponse;
      const checksById = new Map(payload.checks.map((check) => [check.id, check]));
      setItems((current) => current.map((item) => ({ ...item, status: checksById.get(item.id)?.status ?? "blocked" })));
      setCycleNumber(payload.cycleNumber);
      setValidatedAt(payload.validatedAt);
      setHandoff(payload.handoff);
      setHandoffState("published");
      const held = payload.checks.filter((check) => check.required && check.status !== "passed");
      setRunMessage(held.length ? `Production assessment completed. Required checks held: ${held.map((check) => check.label).join(", ")}.` : null);
    } catch (error) {
      setHandoffState("error");
      if (foreground) setItems((current) => current.map((item) => ({ ...item, status: item.status === "running" ? "blocked" : item.status })));
      setRunMessage(error instanceof Error ? error.message : "Production assessment failed; START remains locked.");
    } finally {
      productionRunPending.current = false;
      if (foreground) setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    const lifecycleStream = new EventSource("/api/executive/lifecycle-command-centre/stream");
    const connectivityStream = new EventSource("/api/platform-readiness/connect/stream");
    const pollTimer = window.setInterval(() => void runProductionChecks(), REFRESH_INTERVAL_SECONDS * 1000);
    const countdownTimer = window.setInterval(() => {
      const next = nextCycleRef.current - 1;
      if (next <= 0) {
        nextCycleRef.current = REFRESH_INTERVAL_SECONDS;
        setNextCycleIn(REFRESH_INTERVAL_SECONDS);
      } else {
        nextCycleRef.current = next;
        setNextCycleIn(next);
      }
    }, 1000);
    const onProductionUpdate = () => void runProductionChecks();
    lifecycleStream.addEventListener("message", onProductionUpdate);
    connectivityStream.addEventListener("snapshot", onProductionUpdate);
    window.addEventListener("lifecycle-runtime-updated", onProductionUpdate);
    void runProductionChecks();

    return () => {
      lifecycleStream.close();
      connectivityStream.close();
      window.clearInterval(pollTimer);
      window.clearInterval(countdownTimer);
      window.removeEventListener("lifecycle-runtime-updated", onProductionUpdate);
    };
  }, [runProductionChecks]);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span><ChevronRight size={13} />
        <span>Start</span><ChevronRight size={13} />
        <strong>Pre-Start Checklist</strong>
      </nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>01</span>
            <div><p>Launch readiness gate</p><h1>Pre-Start Checklist</h1></div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>START</span>
            <span>Platform Readiness</span>
            <span>Mode: Fully Autonomous</span>
            <span>Gate policy: Fail Closed</span>
            <span>Decision owner: Lifecycle Orchestrator</span>
            <span>Realtime: SSE + 5s fallback</span>
            <span>Last validated: {formatValidatedAt(validatedAt)}</span>
            <span>Audit: audit.platform-readiness.start.pre-start-checklist</span>
          </div>
        </div>
        <div className={`${styles.gateStatus} ${canStart ? styles.gateReady : ""}`}>
          <small>Autonomous Launch Gate</small>
          <strong>{canStart ? <CircleCheck size={15} /> : <LockKeyhole size={15} />}{canStart ? "Authorized" : "Locked"}</strong>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={`${styles.summaryIcon} ${styles.purple}`}><ClipboardCheck size={21} /></span>
          <div><small>Total Checks</small><strong>{items.length}</strong><p>{items.filter((item) => item.required).length} required for start</p></div>
        </article>
        <article className={styles.summaryCard}>
          <span className={`${styles.summaryIcon} ${styles.green}`}><CircleCheck size={21} /></span>
          <div><small>Passed</small><strong>{counts.passed}</strong><p>Verified controls</p></div>
        </article>
        <article className={styles.summaryCard}>
          <span className={`${styles.summaryIcon} ${styles.orange}`}><AlertTriangle size={21} /></span>
          <div><small>Attention</small><strong>{counts.warning + counts.blocked}</strong><p>{requiredIssues} required issues</p></div>
        </article>
        <article className={styles.summaryCard}>
          <span className={`${styles.summaryIcon} ${styles.blue}`}><Clock3 size={21} /></span>
          <div><small>Autonomous Cycle</small><strong>#{cycleNumber}</strong><p>{counts.running ? `${counts.running} checks running` : `Revalidates in ${nextCycleIn}s`}</p></div>
        </article>
      </section>

      <div className={styles.pageGrid}>
        <section className={styles.checklistPanel}>
          <header className={styles.panelHeader}>
            <div><h2>Autonomous Readiness Checks</h2><p>The lifecycle orchestrator continuously validates every required control and owns the start decision.</p></div>
            <div className={styles.headerActions}>
              <div className={styles.filterGroup} aria-label="Checklist filter">
                <ListFilter size={14} />
                {(["all", "required", "issues"] as const).map((value) => (
                  <button className={filter === value ? styles.activeFilter : ""} onClick={() => setFilter(value)} type="button" key={value}>{value}</button>
                ))}
              </div>
              <div className={styles.automationBadge}><span /><Cpu size={14} />{isRunning ? "Production validation running" : `Monitoring · next cycle ${nextCycleIn}s`}</div>
            </div>
          </header>

          {runMessage ? <div className={styles.runMessage}><AlertTriangle size={16} /><span>{runMessage}</span><button type="button" onClick={() => setRunMessage(null)} aria-label="Dismiss message"><X size={14} /></button></div> : null}

          <div className={styles.categoryList}>
            {categories.map((category) => {
              const categoryItems = visibleItems(category);
              if (!categoryItems.length) return null;
              return (
                <section className={styles.category} key={category}>
                  <header><h3>{category}</h3><span>{categoryItems.length} checks</span></header>
                  <div>
                    {categoryItems.map((item) => {
                      const Icon = item.icon;
                      const isExpanded = expanded.has(item.id);
                      return (
                        <article className={`${styles.checkRow} ${styles[`row_${item.status}`]}`} key={item.id}>
                          <button className={styles.rowMain} type="button" onClick={() => toggleExpanded(item.id)} aria-expanded={isExpanded}>
                            <span className={styles.itemIcon}><Icon size={17} /></span>
                            <span className={styles.itemIdentity}><strong>{item.label}</strong><small>{item.description}</small></span>
                            {item.required ? <span className={styles.requiredBadge}>Required</span> : <span className={styles.optionalBadge}>Optional</span>}
                            <span className={`${styles.statusBadge} ${styles[`status_${item.status}`]}`}>{statusIcon(item.status)}{statusLabels[item.status]}</span>
                            <ChevronDown className={isExpanded ? styles.rotated : ""} size={16} />
                          </button>
                          {isExpanded ? (
                            <div className={styles.rowDetails}>
                              <dl>
                                <div><dt>Validation source</dt><dd>Production service adapter</dd></div>
                                <div><dt>Last validated</dt><dd>{formatValidatedAt(validatedAt)}</dd></div>
                                <div><dt>Audit identity</dt><dd>pre-start.{item.id}</dd></div>
                              </dl>
                              <p>{checkDetail(item.status, item.required)}</p>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {filter === "issues" && !items.some((item) => item.status === "blocked" || item.status === "warning") ? <div className={styles.noIssues}><CircleCheck size={22} /><strong>No recorded issues</strong><span>The autonomous controller is validating current production readiness.</span></div> : null}
          </div>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <div className={styles.railTitle}><h3>Overall Readiness</h3><span>{progress}%</span></div>
            <div className={styles.progressRing} style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>Complete</span></div></div>
            <div className={styles.progressBar}><i style={{ width: `${progress}%` }} /></div>
            <ul className={styles.legend}>
              <li><i className={styles.legendPassed} /><span>Passed</span><b>{counts.passed}</b></li>
              <li><i className={styles.legendRunning} /><span>Checking</span><b>{counts.running}</b></li>
              <li><i className={styles.legendPending} /><span>Pending</span><b>{counts.pending}</b></li>
              <li><i className={styles.legendBlocked} /><span>Blocked</span><b>{counts.blocked}</b></li>
            </ul>
          </article>

          <article className={styles.railCard}>
            <h3>Autonomous Start Decision</h3>
            <div className={`${styles.decisionBadge} ${canStart ? styles.decisionReady : ""}`}><LockKeyhole size={17} /><div><small>Orchestrator decision</small><strong>{canStart ? "START automatically authorized" : "START autonomously locked"}</strong></div></div>
            <dl className={styles.authorizationDetails}>
              <div><dt>Policy</dt><dd>Fail closed</dd></div>
              <div><dt>Decision owner</dt><dd>Lifecycle AI</dd></div>
              <div><dt>Required checks</dt><dd>{items.filter((item) => item.required).length}</dd></div>
              <div><dt>Required issues</dt><dd>{requiredIssues}</dd></div>
              <div><dt>Stage 2 handoff</dt><dd>{handoffState === "publishing" ? "Publishing" : handoffState === "error" ? "Retry pending" : handoff ? handoff.decision : "Awaiting cycle"}</dd></div>
              <div><dt>Correlation</dt><dd>{handoff?.correlationId ?? "Not issued"}</dd></div>
              <div><dt>Human approval</dt><dd>Not required</dd></div>
              <div><dt>Unsafe override</dt><dd>Prohibited</dd></div>
            </dl>
            <div className={`${styles.autonomousOutcome} ${canStart ? styles.outcomeReady : ""}`}>{canStart ? <Zap size={15} /> : <ShieldCheck size={15} />}<span>{canStart ? "The orchestrator will advance the lifecycle automatically." : "The orchestrator will remain at START and retry without intervention."}</span></div>
          </article>

          <article className={styles.railCard}>
            <h3>Autonomous Control</h3>
            <div className={styles.autonomyState}><span /><div><strong>Continuous validation active</strong><small>Cycle #{cycleNumber} · next run in {nextCycleIn}s</small></div></div>
            <button className={styles.secondaryButton} type="button" onClick={() => void runProductionChecks(true)}><FileClock size={14} />Refresh production evidence</button>
            <p className={styles.controlNote}><ShieldCheck size={14} />Every autonomous result retains its evidence, decision rationale, and audit identity.</p>
          </article>
        </aside>
      </div>
    </main>
  );
}

function statusIcon(status: CheckStatus) {
  if (status === "passed") return <CircleCheck size={13} />;
  if (status === "warning") return <AlertTriangle size={13} />;
  if (status === "blocked") return <X size={13} />;
  if (status === "running") return <RefreshCw className={styles.spinning} size={13} />;
  return <Circle size={13} />;
}

function formatValidatedAt(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "Connecting";
}

function checkDetail(status: CheckStatus, required: boolean) {
  if (status === "passed") return "Current production evidence passed this validation check.";
  if (status === "warning") return required ? "Production evidence returned a required warning; START remains locked." : "Optional production evidence returned a warning and will be rechecked.";
  if (status === "blocked") return "Current production evidence did not satisfy this check. It cannot be bypassed.";
  if (status === "running") return "The production adapter is collecting current validation evidence.";
  return "Waiting for the next production validation cycle.";
}
