"use client";

import { Activity, AlertTriangle, ArrowRight, Bot, BrainCircuit, CheckCircle2, ChevronRight, Circle, Cpu, FileClock, GitBranch, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Workflow, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InitializationSnapshot } from "@/types/initialization";
import styles from "./engine-initialization-page.module.css";

type EngineState = "queued" | "binding" | "ready" | "blocked";
type Engine = { id: string; name: string; short: string; role: string; dependency: string; capabilities: string[]; icon: typeof Cpu; color: string; state: EngineState };
const definitions: Engine[] = [
  { id: "lifecycle", name: "Lifecycle Engine", short: "LCE", role: "Stage transitions, orchestration, recovery.", dependency: "Configuration registry", capabilities: ["State machine", "Recovery", "Event routing"], icon: Workflow, color: "violet", state: "queued" },
  { id: "intelligence", name: "Market Intelligence", short: "MIE", role: "Market analysis and governed interpretation.", dependency: "Lifecycle Engine", capabilities: ["Analysis", "Regime", "Context"], icon: Sparkles, color: "blue", state: "queued" },
  { id: "risk", name: "Risk Authority", short: "RAE", role: "Independent controls and non-bypassable veto.", dependency: "Market Intelligence", capabilities: ["Limits", "Veto", "Kill policy"], icon: ShieldCheck, color: "amber", state: "queued" },
  { id: "execution", name: "Execution Engine", short: "EXE", role: "Order routing, fill control, reconciliation.", dependency: "Risk Authority", capabilities: ["Orders", "Fills", "Reconcile"], icon: Zap, color: "red", state: "queued" },
  { id: "learning", name: "Learning Engine", short: "LNE", role: "Outcome review, bounded memory, optimization.", dependency: "Execution Engine", capabilities: ["Review", "Memory", "Drift"], icon: BrainCircuit, color: "green", state: "queued" },
];

export function EngineInitializationPage() {
  const [snapshot, setSnapshot] = useState<InitializationSnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<"connecting" | "live" | "polling">("connecting");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const streamLive = useRef(false);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const response = await fetch("/api/platform-readiness/initialize", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Engine initialization snapshot failed with ${response.status}`);
      const payload = await response.json() as InitializationSnapshot;
      if (!mounted.current) return;
      setSnapshot(payload);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Engine initialization evidence unavailable.");
    } finally {
      pending.current = false;
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
        } catch { setError("A realtime engine snapshot could not be decoded."); }
      });
      next.addEventListener("error", () => {
        if (stream === next) stream = null;
        streamLive.current = false;
        next.close();
        setStreamMode("polling");
        if (mounted.current && reconnectTimer === null) reconnectTimer = window.setTimeout(() => { reconnectTimer = null; connect(); }, 3000);
      });
    };
    const pollTimer = window.setInterval(() => { if (!streamLive.current) void refresh(); }, 5000);
    const onRuntimeUpdate = () => void refresh();
    window.addEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    connect();
    void refresh();
    return () => {
      mounted.current = false;
      streamLive.current = false;
      stream?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    };
  }, [refresh]);

  const engineEvidence = snapshot?.steps.find((step) => step.id === "engines");
  const engines = definitions.map((engine): Engine => ({
    ...engine,
    state: engine.id === "lifecycle"
      ? snapshot ? snapshot.runtime.status === "running" && snapshot.runtime.currentStage === "initialize" ? "ready" : "blocked" : "queued"
      : mapState(engineEvidence?.status),
  }));
  const counts = useMemo(() => ({ ready: engines.filter((engine) => engine.state === "ready").length, blocked: engines.filter((engine) => engine.state === "blocked").length, binding: engines.filter((engine) => engine.state === "binding").length, queued: engines.filter((engine) => engine.state === "queued").length }), [engines]);
  const progress = Math.round(((counts.ready + counts.blocked) / engines.length) * 100);
  const ready = engines.every((engine) => engine.state === "ready");
  const active = counts.binding > 0;
  const cycle = snapshot?.cycle ?? 0;

  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Engine Initialization</strong></nav>
    <header className={styles.heading}><div><span>CONTROL GROUP 02 · RUNTIME AUTHORITIES</span><h1><Cpu size={28}/>Engine Initialization</h1><p>Booting isolated engines through a strict, evidence-backed dependency chain.</p></div><div className={styles.cycle}><RefreshCw className={active ? styles.spin : ""} size={17}/><span><small>AUTONOMOUS CYCLE · {streamMode.toUpperCase()}</small><strong>#{cycle} · {active ? "BINDING" : snapshot?.decision ?? "CONNECTING"} · {formatTime(snapshot?.updatedAt)}</strong></span></div></header>

    <section className={styles.controlRoom}>
      <div className={styles.controlHeader}><div><span className={styles.liveDot}/><strong>ENGINE BUS / INITIALIZATION CHANNEL</strong><small>{error ?? engineEvidence?.evidence ?? "Connecting to ordered, idempotent, fail-closed evidence."}</small></div><div className={`${styles.decision} ${ready ? styles.good : ""}`}>{ready ? <CheckCircle2 size={14}/> : <LockKeyhole size={14}/>} {ready ? "ALL AUTHORITIES ONLINE" : active ? "BOOT SEQUENCE ACTIVE" : snapshot ? "ENGINE BUS LOCKED" : "CONNECTING"}</div></div>
      <div className={styles.bus}><div className={styles.busLine}/>{engines.map((engine, index) => { const Icon = engine.icon; return <div className={styles.nodeWrap} key={engine.id}><article className={`${styles.node} ${styles[engine.color]} ${styles[engine.state]}`}><div className={styles.nodeTop}><span>{engine.short}</span><b>{stateIcon(engine.state)}{engine.state === "binding" ? "BINDING" : engine.state === "blocked" ? "OFFLINE" : engine.state.toUpperCase()}</b></div><div className={styles.nodeCore}><Icon size={25}/><i/></div><h2>{engine.name}</h2><p>{engine.role}</p><div className={styles.caps}>{engine.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div><div className={styles.dep}><small>REQUIRES</small><strong>{engine.dependency}</strong></div></article>{index < engines.length - 1 ? <ArrowRight className={styles.arrow} size={18}/> : null}</div>; })}</div>
      <div className={styles.busFooter}><span><GitBranch size={14}/>Dependency graph correlated with cycle #{cycle}</span><b>{progress}% ASSESSED</b><div><i style={{ width: `${progress}%` }}/></div></div>
    </section>

    <div className={styles.lowerGrid}>
      <section className={styles.diagnostics}><header><div><Activity size={18}/><span><h2>Boot Diagnostics</h2><p>Production bindings and authority contracts</p></span></div><b>{streamMode === "live" ? "STREAMING" : "SNAPSHOT"}</b></header><div className={styles.tableHead}><span>Engine authority</span><span>Manifest</span><span>Event contract</span><span>State recovery</span><span>Runtime</span></div>{engines.map((engine) => <div className={styles.tableRow} key={engine.id}><strong>{engine.name}</strong><span><Circle size={7}/>Resolved</span><span>{engine.state === "ready" ? <CheckCircle2 size={10}/> : <XCircle size={10}/>} {engine.state === "ready" ? "Bound" : "Unbound"}</span><span>{engine.state === "ready" ? <CheckCircle2 size={10}/> : <XCircle size={10}/>} {engine.state === "ready" ? "Verified" : "Unverified"}</span><b>{engine.state === "ready" ? "ONLINE" : engine.state === "binding" ? "BINDING" : "HELD"}</b></div>)}</section>
      <aside className={styles.authority}><header><ShieldCheck size={19}/><div><h2>Authority Boundary</h2><p>Runtime separation enforced</p></div></header><div className={styles.boundary}><span>Lifecycle</span><b>May orchestrate</b><small>Cannot authorize trades</small></div><div className={styles.boundary}><span>Intelligence</span><b>May observe</b><small>Cannot execute orders</small></div><div className={styles.boundary}><span>Risk</span><b>May veto</b><small>Cannot be overridden</small></div><div className={styles.boundary}><span>Execution</span><b>May route</b><small>Requires risk authorization</small></div><div className={styles.boundary}><span>Learning</span><b>May recommend</b><small>Cannot mutate live policy</small></div></aside>
    </div>

    <section className={styles.auditBar}><div><Bot size={17}/><span><strong>Lifecycle Orchestrator</strong><small>{active ? "Binding runtime authorities in strict order" : `Monitoring production bindings via ${streamMode}`}</small></span></div><div><span>Operational</span><b>{counts.ready}</b></div><div><span>Binding</span><b>{counts.binding}</b></div><div><span>Queued</span><b>{counts.queued}</b></div><div><span>Blocked</span><b>{counts.blocked}</b></div><p><AlertTriangle size={14}/><span><strong>Fail closed:</strong> no simulated engine readiness</span></p><a href="/platform-readiness/initialize/initialization-logs"><FileClock size={14}/>Audit evidence <ChevronRight size={12}/></a></section>
  </main>;
}

function stateIcon(state: EngineState) { if (state === "ready") return <CheckCircle2 size={11}/>; if (state === "binding") return <RefreshCw className={styles.spin} size={11}/>; if (state === "blocked") return <XCircle size={11}/>; return <Circle size={11}/>; }
function mapState(status?: InitializationSnapshot["steps"][number]["status"]): EngineState { if (status === "ready") return "ready"; if (status === "running") return "binding"; if (status === "blocked") return "blocked"; return "queued"; }
function formatTime(value?: string | null) { if (!value) return "--:--:--"; return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)); }
