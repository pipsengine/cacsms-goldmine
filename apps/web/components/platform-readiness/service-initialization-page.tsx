"use client";

import { Activity, AlertTriangle, BellRing, Bot, CalendarClock, CheckCircle2, ChevronRight, Circle, CloudCog, Database, FileClock, FileSearch, KeyRound, LockKeyhole, Newspaper, Radio, RefreshCw, ServerCog, ShieldCheck, TimerReset, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectivitySnapshot, ConnectivitySnapshotResponse, ConnectivityStatus } from "@/types/connectivity";
import type { InitializationSnapshot } from "@/types/initialization";
import styles from "./service-initialization-page.module.css";

type ServiceState = "queued" | "connecting" | "ready" | "blocked";
type Service = { id: string; connectivityId: string | null; name: string; label: string; role: string; prerequisite: string; checks: string[]; icon: typeof ServerCog; layer: "Foundation" | "Data" | "Transport" | "Control"; state: ServiceState };
const definitions: Service[] = [
  { id: "database", connectivityId: "database", name: "Operational Database", label: "DB", role: "Durable state, checkpoints, and transactional records.", prerequisite: "Database credentials", checks: ["Connectivity", "Schema", "Write durability"], icon: Database, layer: "Foundation", state: "queued" },
  { id: "market", connectivityId: "market-feed", name: "Market Data Service", label: "MD", role: "Live price, spread, session, and instrument data.", prerequisite: "Provider endpoint", checks: ["Feed health", "Clock skew", "Consensus"], icon: Radio, layer: "Data", state: "queued" },
  { id: "news", connectivityId: "news-calendar", name: "News & Calendar", label: "NC", role: "Economic events, news, impact, and embargo state.", prerequisite: "Market Data Service", checks: ["News stream", "Calendar sync", "Coverage"], icon: Newspaper, layer: "Data", state: "queued" },
  { id: "messaging", connectivityId: "audit-stream", name: "Messaging Service", label: "MQ", role: "Typed transport for engine, agent, and alert traffic.", prerequisite: "Operational Database", checks: ["Event bus", "Delivery", "Dead letters"], icon: BellRing, layer: "Transport", state: "queued" },
  { id: "audit", connectivityId: "audit-stream", name: "Audit Evidence", label: "AU", role: "Immutable decisions, evidence, controls, and access history.", prerequisite: "Messaging Service", checks: ["Append store", "Integrity seal", "Retention"], icon: FileSearch, layer: "Control", state: "queued" },
  { id: "scheduler", connectivityId: null, name: "Autonomous Scheduler", label: "SC", role: "Recurring work, retries, deadlines, and recovery triggers.", prerequisite: "Audit Evidence", checks: ["Leader lock", "Clock source", "Recovery queue"], icon: CalendarClock, layer: "Control", state: "queued" },
];

export function ServiceInitializationPage() {
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
      if (!initializationResponse.ok || !connectivityResponse.ok) throw new Error("Service initialization evidence request failed.");
      const initializationPayload = await initializationResponse.json() as InitializationSnapshot;
      const connectivityPayload = await connectivityResponse.json() as ConnectivitySnapshotResponse;
      if (!mounted.current) return;
      setInitialization(initializationPayload);
      setConnectivity(connectivityPayload.snapshot);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Service initialization evidence unavailable.");
    } finally { pending.current = false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initializeStream = new EventSource("/api/platform-readiness/initialize/stream");
    const connectivityStream = new EventSource("/api/platform-readiness/connect/stream");
    const markOpen = () => { liveStreams.current += 1; setStreamMode("live"); };
    const markError = () => { liveStreams.current = Math.max(0, liveStreams.current - 1); if (liveStreams.current === 0) setStreamMode("polling"); };
    initializeStream.addEventListener("open", markOpen);
    initializeStream.addEventListener("snapshot", (event) => { try { setInitialization(JSON.parse((event as MessageEvent).data) as InitializationSnapshot); setError(null); } catch { setError("A realtime initialization snapshot could not be decoded."); } });
    initializeStream.addEventListener("error", markError);
    connectivityStream.addEventListener("open", markOpen);
    connectivityStream.addEventListener("snapshot", (event) => { try { setConnectivity(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot); setError(null); } catch { setError("A realtime connectivity snapshot could not be decoded."); } });
    connectivityStream.addEventListener("error", markError);
    const pollTimer = window.setInterval(() => { if (liveStreams.current === 0) void refresh(); }, 5000);
    const onRuntimeUpdate = () => void refresh();
    window.addEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    void refresh();
    return () => { mounted.current = false; liveStreams.current = 0; initializeStream.close(); connectivityStream.close(); window.clearInterval(pollTimer); window.removeEventListener("lifecycle-runtime-updated", onRuntimeUpdate); };
  }, [refresh]);

  const services = definitions.map((service): Service & { evidence: string } => {
    const liveService = service.connectivityId ? connectivity?.services.find((item) => item.id === service.connectivityId) : null;
    return { ...service, state: service.connectivityId ? mapState(liveService?.status) : connectivity ? "blocked" : "queued", evidence: liveService?.evidence ?? (service.id === "scheduler" ? "No production scheduler health adapter is configured." : "Connecting to service evidence.") };
  });
  const counts = useMemo(() => ({ ready: services.filter((service) => service.state === "ready").length, blocked: services.filter((service) => service.state === "blocked").length, connecting: services.filter((service) => service.state === "connecting").length, queued: services.filter((service) => service.state === "queued").length }), [services]);
  const progress = Math.round(((counts.ready + counts.blocked) / services.length) * 100);
  const ready = services.every((service) => service.state === "ready") && initialization?.handoffAuthorized;
  const active = counts.connecting > 0;
  const cycle = initialization?.cycle ?? 0;
  const databaseReady = services.find((service) => service.id === "database")?.state === "ready";
  const marketReady = services.find((service) => service.id === "market")?.state === "ready";
  const auditReady = services.find((service) => service.id === "audit")?.state === "ready";

  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Service Initialization</strong></nav>
    <header className={styles.heading}><div className={styles.headingMain}><span className={styles.serverIcon}><ServerCog size={25}/></span><div><span>INITIALIZE · INFRASTRUCTURE LAYER 04</span><h1>Service Initialization</h1><p>Production connectivity, durability, freshness, messaging, evidence, and scheduling.</p></div></div><div className={styles.headingMeta}><span><i className={active ? styles.pulse : ""}/>{streamMode === "live" ? "LIVE SERVICE EVIDENCE" : streamMode === "polling" ? "POLLING FALLBACK" : "CONNECTING"}</span><small>Cycle #{cycle} · updated {formatTime(connectivity?.generatedAt ?? initialization?.updatedAt)}</small></div></header>

    <section className={`${styles.systemBanner} ${ready ? styles.systemReady : ""}`}><div className={styles.bannerState}>{ready ? <CheckCircle2 size={24}/> : <LockKeyhole size={24}/>}<span><small>SERVICE MESH DECISION</small><strong>{ready ? "PRODUCTION SERVICE LAYER READY" : error ?? "INITIALIZATION HELD — REQUIRED SERVICES UNAVAILABLE"}</strong></span></div><div className={styles.bannerMetrics}><div><small>Required</small><b>{services.length}</b></div><div><small>Operational</small><b>{counts.ready}</b></div><div><small>Connecting</small><b>{counts.connecting}</b></div><div><small>Unavailable</small><b>{counts.blocked}</b></div><div><small>Assessed</small><b>{progress}%</b></div></div></section>

    <div className={styles.layout}>
      <section className={styles.infrastructure}><div className={styles.sectionTitle}><div><h2>Production Infrastructure Map</h2><p>Services are arranged by runtime layer and joined only through verified contracts.</p></div><span><CloudCog size={15}/>{streamMode === "live" ? "Health stream active" : "Snapshot monitoring"}</span></div><div className={styles.layerMap}>{["Data", "Foundation", "Transport", "Control"].map((layer, index) => <div className={styles.layer} key={layer}><div className={styles.layerLabel}><b>0{index + 1}</b><span>{layer}</span><i/></div><div className={styles.serviceLane}>{services.filter((service) => service.layer === layer).map((service) => { const Icon = service.icon; return <article className={`${styles.serviceNode} ${styles[service.state]}`} key={service.id}><div className={styles.nodeHead}><span className={styles.nodeIcon}><Icon size={19}/><b>{service.label}</b></span><span className={styles.nodeState}>{stateIcon(service.state)}{service.state === "connecting" ? "CONNECTING" : service.state === "blocked" ? "UNAVAILABLE" : service.state.toUpperCase()}</span></div><h3>{service.name}</h3><p>{service.evidence}</p><div className={styles.endpoint}><small>PREREQUISITE</small><strong>{service.prerequisite}</strong></div><div className={styles.checks}>{service.checks.map((check) => <span key={check}><Circle size={6}/>{check}</span>)}</div></article>; })}</div></div>)}</div></section>

      <aside className={styles.telemetry}><div className={styles.telemetryHead}><span><Activity size={18}/></span><div><h2>Live Telemetry</h2><p>Admission evidence from production probes</p></div></div><div className={styles.progress}><div><span style={{ width: `${progress}%` }}/></div><small>{progress}% of service checks assessed</small></div><div className={styles.signalList}><Signal label="Endpoint reachability" value={`${counts.ready}/${services.length} online`}/><Signal label="Identity exchange" value={connectivity?.diagnostics.auth ?? "Pending"}/><Signal label="Write durability" value={databaseReady ? "Verified" : "Unavailable"}/><Signal label="Data freshness" value={marketReady ? "Live" : "Unavailable"}/><Signal label="Recovery path" value="No adapter"/><Signal label="Audit transport" value={auditReady ? "Online" : "Offline"}/></div><div className={styles.controller}><Bot size={18}/><span><strong>Infrastructure Orchestrator</strong><small>Automatic · strict order · fail closed</small></span></div><dl className={styles.facts}><div><dt>Refresh policy</dt><dd>REALTIME</dd></div><div><dt>Mock fallback</dt><dd>PROHIBITED</dd></div><div><dt>Lifecycle</dt><dd>{initialization?.runtime.status.toUpperCase() ?? "PENDING"}</dd></div><div><dt>Outcome</dt><dd className={ready ? "" : styles.hold}>{ready ? "READY" : "HOLD"}</dd></div></dl></aside>
    </div>

    <section className={styles.evidenceBoard}><div className={styles.evidenceTitle}><FileClock size={18}/><div><h2>Service Admission Evidence</h2><p>Every displayed decision comes from a production probe.</p></div></div><div className={styles.evidenceGrid}><Evidence icon={KeyRound} title="Authenticated endpoint" verified={connectivity?.diagnostics.auth === "online"}/><Evidence icon={Activity} title="Live health proof" verified={counts.ready > 0}/><Evidence icon={Database} title="Durable write path" verified={databaseReady}/><Evidence icon={TimerReset} title="Deterministic recovery" verified={false}/><Evidence icon={ShieldCheck} title="Least privilege" verified={false}/></div><div className={styles.warning}><AlertTriangle size={15}/><span><strong>No synthetic readiness.</strong> Missing service and scheduler evidence remains visible and fail-closed.</span></div></section>
  </main>;
}

function Signal({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div>; }
function Evidence({ icon: Icon, title, verified }: { icon: typeof ServerCog; title: string; verified: boolean }) { return <div><Icon size={15}/><span>{title}</span><b>{verified ? "VERIFIED" : "UNVERIFIED"}</b></div>; }
function stateIcon(state: ServiceState) { if (state === "ready") return <CheckCircle2 size={11}/>; if (state === "connecting") return <RefreshCw className={styles.spin} size={11}/>; if (state === "blocked") return <XCircle size={11}/>; return <Circle size={11}/>; }
function mapState(status?: ConnectivityStatus): ServiceState { if (status === "online") return "ready"; if (status === "connecting") return "connecting"; if (status === "degraded" || status === "offline") return "blocked"; return "queued"; }
function formatTime(value?: string | null) { if (!value) return "--:--:--"; return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)); }
