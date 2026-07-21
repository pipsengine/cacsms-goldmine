"use client";

import { AlertTriangle, ArrowDown, Bot, CheckCircle2, ChevronRight, Circle, Clock3, CloudCog, Database, FileCheck2, FileClock, GitBranch, KeyRound, LockKeyhole, Newspaper, Radio, RefreshCw, Route, Server, ShieldCheck, Waypoints, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectivitySnapshot, ConnectivitySnapshotResponse, ConnectivityStatus } from "@/types/connectivity";
import type { InitializationSnapshot, InitializationStatus } from "@/types/initialization";
import styles from "./dependency-monitor-page.module.css";

type DependencyState = "waiting" | "probing" | "healthy" | "blocked";
type Layer = "Foundation" | "Data" | "Authority" | "Execution";
type Dependency = { id: string; name: string; short: string; layer: Layer; requires: string[]; consumer: string; contract: string; icon: typeof Server; state: DependencyState };
const definitions: Dependency[] = [
  { id: "config", name: "Configuration Registry", short: "CFG", layer: "Foundation", requires: [], consumer: "Lifecycle Engine", contract: "Signed configuration manifest", icon: FileCheck2, state: "waiting" },
  { id: "database", name: "Operational Database", short: "DB", layer: "Foundation", requires: ["config"], consumer: "State & evidence", contract: "Transactional read/write", icon: Database, state: "waiting" },
  { id: "events", name: "Event Transport", short: "EVT", layer: "Foundation", requires: ["database"], consumer: "All engines & agents", contract: "Typed durable delivery", icon: Waypoints, state: "waiting" },
  { id: "market", name: "Market Data Feed", short: "MKT", layer: "Data", requires: ["config", "events"], consumer: "Market Intelligence", contract: "Fresh consensus prices", icon: Radio, state: "waiting" },
  { id: "news", name: "News & Calendar", short: "NWS", layer: "Data", requires: ["events"], consumer: "News Intelligence", contract: "Current event coverage", icon: Newspaper, state: "waiting" },
  { id: "risk", name: "Risk Authority Channel", short: "RSK", layer: "Authority", requires: ["database", "events", "market"], consumer: "Decision & execution", contract: "Independent veto path", icon: ShieldCheck, state: "waiting" },
  { id: "broker", name: "Broker Gateway", short: "BRK", layer: "Execution", requires: ["market", "risk"], consumer: "Execution Engine", contract: "Authenticated order route", icon: Zap, state: "waiting" },
  { id: "audit", name: "Immutable Audit Store", short: "AUD", layer: "Execution", requires: ["database", "events"], consumer: "Lifecycle governance", contract: "Append-only evidence", icon: FileClock, state: "waiting" },
];
const layers: Layer[] = ["Foundation", "Data", "Authority", "Execution"];

export function DependencyMonitorPage() {
  const [initialization, setInitialization] = useState<InitializationSnapshot | null>(null);
  const [connectivity, setConnectivity] = useState<ConnectivitySnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<"connecting" | "live" | "polling">("connecting");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const liveStreams = useRef(0);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const [initializationResponse, connectivityResponse] = await Promise.all([
        fetch("/api/platform-readiness/initialize", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/platform-readiness/connect", { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);
      if (!initializationResponse.ok || !connectivityResponse.ok) throw new Error("Dependency evidence request failed.");
      const initializationPayload = await initializationResponse.json() as InitializationSnapshot;
      const connectivityPayload = await connectivityResponse.json() as ConnectivitySnapshotResponse;
      if (!mounted.current) return;
      setInitialization(initializationPayload);
      setConnectivity(connectivityPayload.snapshot);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Dependency evidence unavailable.");
    } finally { pending.current = false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initializationStream = new EventSource("/api/platform-readiness/initialize/stream");
    const connectivityStream = new EventSource("/api/platform-readiness/connect/stream");
    const markOpen = () => { liveStreams.current += 1; setStreamMode("live"); };
    const markError = () => { liveStreams.current = Math.max(0, liveStreams.current - 1); if (liveStreams.current === 0) setStreamMode("polling"); };
    initializationStream.addEventListener("open", markOpen);
    initializationStream.addEventListener("snapshot", (event) => { try { setInitialization(JSON.parse((event as MessageEvent).data) as InitializationSnapshot); setError(null); } catch { setError("A realtime initialization event could not be decoded."); } });
    initializationStream.addEventListener("error", markError);
    connectivityStream.addEventListener("open", markOpen);
    connectivityStream.addEventListener("snapshot", (event) => { try { setConnectivity(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot); setError(null); } catch { setError("A realtime connectivity event could not be decoded."); } });
    connectivityStream.addEventListener("error", markError);
    const pollTimer = window.setInterval(() => { if (liveStreams.current === 0) void refresh(); }, 5000);
    const onRuntimeUpdate = () => void refresh();
    window.addEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    void refresh();
    return () => { mounted.current = false; liveStreams.current = 0; initializationStream.close(); connectivityStream.close(); window.clearInterval(pollTimer); window.removeEventListener("lifecycle-runtime-updated", onRuntimeUpdate); };
  }, [refresh]);

  const dependencies = resolveDependencies(initialization, connectivity);
  const counts = useMemo(() => ({ healthy: dependencies.filter((dependency) => dependency.state === "healthy").length, blocked: dependencies.filter((dependency) => dependency.state === "blocked").length, probing: dependencies.filter((dependency) => dependency.state === "probing").length, waiting: dependencies.filter((dependency) => dependency.state === "waiting").length }), [dependencies]);
  const assessed = counts.healthy + counts.blocked;
  const progress = Math.round(assessed / dependencies.length * 100);
  const resolved = dependencies.every((dependency) => dependency.state === "healthy") && initialization?.handoffAuthorized;
  const scanning = counts.probing > 0;
  const cycle = initialization?.cycle ?? 0;

  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Dependency Monitor</strong></nav>
    <header className={styles.heading}><div className={styles.title}><span><GitBranch size={24}/></span><div><small>INITIALIZE · CONTROL GROUP 05</small><h1>Dependency Monitor</h1><p>Live contract resolution, startup ordering, and blocked-path propagation.</p></div></div><div className={styles.scanState}><RefreshCw className={scanning ? styles.spin : ""} size={16}/><span><small>RESOLUTION CYCLE #{cycle}</small><strong>{streamMode === "live" ? `LIVE · ${formatTime(connectivity?.generatedAt ?? initialization?.updatedAt)}` : streamMode === "polling" ? "POLLING FALLBACK" : "CONNECTING"}</strong></span></div></header>

    <section className={`${styles.decisionBar} ${resolved ? styles.resolved : ""}`}><div>{resolved ? <CheckCircle2 size={20}/> : <LockKeyhole size={20}/>}<span><small>DEPENDENCY DECISION</small><strong>{resolved ? "ALL STARTUP CONTRACTS RESOLVED" : "INITIALIZATION PATH BLOCKED"}</strong></span></div><p>{error ?? (resolved ? "The orchestrator may continue automatically." : "Unavailable production contracts propagate HOLD to downstream consumers. No dependency can be bypassed.")}</p><div className={styles.metrics}><span><b>{counts.healthy}</b>Healthy</span><span><b>{counts.probing}</b>Probing</span><span><b>{counts.blocked}</b>Blocked</span><span><b>{progress}%</b>Assessed</span></div></section>

    <div className={styles.workspace}>
      <section className={styles.graphPanel}><header><div><Route size={18}/><span><h2>Runtime Dependency Graph</h2><p>Edges represent required production contracts and propagate failure forward.</p></span></div><b><i/>{streamMode === "live" ? "LIVE TOPOLOGY" : "SNAPSHOT"}</b></header><div className={styles.graphCanvas}><div className={styles.gridLines}/>{layers.map((layer, layerIndex) => <section className={styles.graphLayer} key={layer}><div className={styles.layerTitle}><b>0{layerIndex + 1}</b><span>{layer}</span><small>{dependencies.filter((dependency) => dependency.layer === layer).length} NODES</small></div><div className={styles.nodes}>{dependencies.filter((dependency) => dependency.layer === layer).map((dependency) => { const Icon = dependency.icon; return <article className={`${styles.node} ${styles[dependency.state]}`} key={dependency.id}><div className={styles.nodeHead}><span><Icon size={17}/><b>{dependency.short}</b></span><em>{stateIcon(dependency.state)}{dependency.state === "probing" ? "PROBING" : dependency.state.toUpperCase()}</em></div><h3>{dependency.name}</h3><p>{dependency.evidence}</p><div><small>CONSUMER</small><strong>{dependency.consumer}</strong></div>{dependency.requires.length ? <footer><GitBranch size={10}/>requires {dependency.requires.map((id) => definitions.find((item) => item.id === id)?.short).join(" + ")}</footer> : <footer><CheckCircle2 size={10}/>root dependency</footer>}</article>; })}</div>{layerIndex < layers.length - 1 ? <div className={styles.layerLink}><ArrowDown size={14}/></div> : null}</section>)}</div></section>

      <aside className={styles.resolverPanel}><div className={styles.resolverHead}><span><Bot size={21}/></span><div><small>AUTONOMOUS CONTROLLER</small><h2>Graph Resolver</h2><p>Continuous · deterministic</p></div><i/></div><div className={styles.progress}><div style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><b>{progress}%</b><small>ASSESSED</small></span></div></div><div className={styles.legend}><span><i className={styles.green}/>Healthy <b>{counts.healthy}</b></span><span><i className={styles.blue}/>Probing <b>{counts.probing}</b></span><span><i className={styles.gray}/>Waiting <b>{counts.waiting}</b></span><span><i className={styles.red}/>Blocked <b>{counts.blocked}</b></span></div><div className={styles.critical}><AlertTriangle size={15}/><div><small>CRITICAL PATH</small><strong>CFG → DB → EVT → MKT → RSK → BRK</strong><p>{firstBlocked(dependencies)}</p></div></div><dl><div><dt>Resolution order</dt><dd>TOPOLOGICAL</dd></div><div><dt>Cycle handling</dt><dd>REJECT</dd></div><div><dt>Missing contract</dt><dd>HOLD</dd></div><div><dt>Manual override</dt><dd>PROHIBITED</dd></div></dl></aside>
    </div>

    <section className={styles.contracts}><header><div><KeyRound size={18}/><span><h2>Contract Resolution Ledger</h2><p>Current evidence for every required edge.</p></span></div><a href="/platform-readiness/initialize/initialization-logs">View initialization audit <ChevronRight size={13}/></a></header><div className={styles.tableHead}><span>Dependency</span><span>Required by</span><span>Contract</span><span>Evidence</span><span>Propagation</span></div>{dependencies.map((dependency) => <div className={styles.tableRow} key={dependency.id}><strong>{dependency.name}</strong><span>{dependency.consumer}</span><span>{dependency.contract}</span><b>{dependency.state === "healthy" ? <CheckCircle2 size={11}/> : <XCircle size={11}/>} {dependency.state === "healthy" ? "Verified" : dependency.state}</b><em>Blocks {downstreamCount(dependency.id)} downstream</em></div>)}<footer><CloudCog size={14}/><span>Graph changes and propagation decisions update from live production evidence.</span><time><Clock3 size={12}/>{streamMode === "live" ? "Realtime stream active" : "5s polling fallback"}</time></footer></section>
  </main>;
}

function resolveDependencies(initialization: InitializationSnapshot | null, connectivity: ConnectivitySnapshot | null) {
  const config = initialization?.steps.find((step) => step.id === "configuration");
  const agents = initialization?.steps.find((step) => step.id === "agents");
  const service = (id: string) => connectivity?.services.find((item) => item.id === id);
  const base = new Map<string, { state: DependencyState; evidence: string }>([
    ["config", { state: mapInitialization(config?.status), evidence: config?.evidence ?? "Connecting to configuration evidence." }],
    ["database", fromConnectivity(service("database")?.status, service("database")?.evidence)],
    ["events", fromConnectivity(service("audit-stream")?.status, service("audit-stream")?.evidence)],
    ["market", fromConnectivity(service("market-feed")?.status, service("market-feed")?.evidence)],
    ["news", fromConnectivity(service("news-calendar")?.status, service("news-calendar")?.evidence)],
    ["risk", { state: mapInitialization(agents?.status), evidence: agents?.evidence ?? "Connecting to risk authority evidence." }],
    ["broker", fromConnectivity(service("mt5-bridge")?.status, service("mt5-bridge")?.evidence)],
    ["audit", fromConnectivity(service("audit-stream")?.status, service("audit-stream")?.evidence)],
  ]);
  const resolved: Array<Dependency & { evidence: string }> = [];
  for (const definition of definitions) {
    const own = base.get(definition.id) ?? { state: "waiting" as const, evidence: "No evidence available." };
    const requirements = definition.requires.map((id) => resolved.find((item) => item.id === id)?.state ?? "waiting");
    const state = requirements.includes("blocked") ? "blocked" : requirements.includes("probing") ? "probing" : requirements.includes("waiting") ? "waiting" : own.state;
    resolved.push({ ...definition, state, evidence: state === own.state ? own.evidence : `Upstream dependency held; source evidence: ${own.evidence}` });
  }
  return resolved;
}

function fromConnectivity(status?: ConnectivityStatus, evidence?: string) { return { state: status === "online" ? "healthy" as const : status === "connecting" ? "probing" as const : status ? "blocked" as const : "waiting" as const, evidence: evidence ?? "Connecting to production evidence." }; }
function mapInitialization(status?: InitializationStatus): DependencyState { if (status === "ready") return "healthy"; if (status === "running") return "probing"; if (status === "blocked") return "blocked"; return "waiting"; }
function stateIcon(state: DependencyState) { if (state === "healthy") return <CheckCircle2 size={11}/>; if (state === "probing") return <RefreshCw className={styles.spin} size={11}/>; if (state === "blocked") return <XCircle size={11}/>; return <Circle size={11}/>; }
function downstreamCount(id: string) { const seen = new Set<string>(); const visit = (source: string) => definitions.filter((item) => item.requires.includes(source)).forEach((item) => { if (!seen.has(item.id)) { seen.add(item.id); visit(item.id); } }); visit(id); return seen.size; }
function firstBlocked(dependencies: Array<Dependency & { evidence: string }>) { const blocked = dependencies.find((dependency) => dependency.state === "blocked"); return blocked ? `Critical path is held at ${blocked.short}: ${blocked.evidence}` : "Critical path is awaiting production evidence."; }
function formatTime(value?: string | null) { if (!value) return "--:--:--"; return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)); }
