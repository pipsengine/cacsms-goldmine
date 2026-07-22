"use client";

import { AlertTriangle, Bot, Braces, CheckCircle2, ChevronRight, Circle, Clock3, Code2, Database, FileCheck2, FileClock, FileJson2, Fingerprint, GitMerge, KeyRound, Layers3, LockKeyhole, RefreshCw, ScrollText, Settings2, ShieldCheck, SlidersHorizontal, Workflow, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InitializationSnapshot, InitializationStepSnapshot } from "@/types/initialization";
import styles from "./configuration-loading-page.module.css";

type ConfigState = "queued" | "loading" | "verified" | "rejected";
type Config = { id: string; name: string; file: string; purpose: string; schema: string; fields: number; priority: number; icon: typeof FileJson2; state: ConfigState };

const definitions: Config[] = [
  { id: "environment", name: "Environment Configuration", file: "environment.production.json", purpose: "Runtime identity, regions, endpoints, and feature boundaries.", schema: "gold.environment/v3", fields: 18, priority: 1, icon: Settings2, state: "queued" },
  { id: "trading", name: "Trading Configuration", file: "trading.xauusd.json", purpose: "Instrument, session, operating mode, and execution behavior.", schema: "gold.trading/v5", fields: 27, priority: 2, icon: SlidersHorizontal, state: "queued" },
  { id: "strategy", name: "Strategy Configuration", file: "strategies.approved.json", purpose: "Eligible strategies, regimes, parameters, and confidence rules.", schema: "gold.strategy/v4", fields: 34, priority: 3, icon: Braces, state: "queued" },
  { id: "risk", name: "Risk Configuration", file: "risk.conservative.json", purpose: "Exposure limits, drawdown boundaries, vetoes, and kill policy.", schema: "gold.risk/v6", fields: 31, priority: 4, icon: ShieldCheck, state: "queued" },
  { id: "lifecycle", name: "Lifecycle Configuration", file: "lifecycle.autonomous.json", purpose: "Stage transitions, recovery, retries, and audit obligations.", schema: "gold.lifecycle/v3", fields: 22, priority: 5, icon: Workflow, state: "queued" },
];

export function ConfigurationLoadingPage() {
  const [snapshot, setSnapshot] = useState<InitializationSnapshot | null>(null);
  const [selected, setSelected] = useState("environment");
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
      if (!response.ok) throw new Error(`Configuration snapshot failed with ${response.status}`);
      const payload = await response.json() as InitializationSnapshot;
      if (!mounted.current) return;
      setSnapshot(payload);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Configuration evidence unavailable.");
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
      next.addEventListener("open", () => {
        streamLive.current = true;
        setStreamMode("live");
      });
      next.addEventListener("snapshot", (event) => {
        try {
          setSnapshot(JSON.parse((event as MessageEvent).data) as InitializationSnapshot);
          setError(null);
          setStreamMode("live");
        } catch {
          setError("A realtime configuration snapshot could not be decoded.");
        }
      });
      next.addEventListener("error", () => {
        if (stream === next) stream = null;
        streamLive.current = false;
        next.close();
        setStreamMode("polling");
        if (mounted.current && reconnectTimer === null) {
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      });
    };

    const pollTimer = window.setInterval(() => {
      if (!streamLive.current) void refresh();
    }, 5000);
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

  const configuration = snapshot?.steps.find((step) => step.id === "configuration");
  const configs = useMemo(() => mapConfigs(configuration), [configuration]);
  const counts = useMemo(() => ({ verified: configs.filter((config) => config.state === "verified").length, rejected: configs.filter((config) => config.state === "rejected").length, loading: configs.filter((config) => config.state === "loading").length, queued: configs.filter((config) => config.state === "queued").length }), [configs]);
  const active = configs.find((config) => config.id === selected) ?? configs[0];
  const assessed = counts.verified + counts.rejected;
  const progress = Math.round((assessed / configs.length) * 100);
  const ready = configuration?.status === "ready" && configs.every((config) => config.state === "verified");
  const loading = configuration?.status === "running" || streamMode === "connecting";
  const decision = ready ? "RESOLVED CONFIGURATION SEALED" : configuration?.status === "pending" ? "WAITING FOR START HANDOFF" : "CONFIGURATION SET REJECTED";
  const evidence = error ?? configuration?.evidence ?? snapshot?.message ?? "Connecting to realtime initialization evidence.";
  const lastVerified = active.state === "verified" ? formatDateTime(snapshot?.updatedAt) : active.state === "loading" ? "Resolving now" : "Never";

  return <main className={styles.page}>
    <nav className={styles.breadcrumb}><a href="/platform-readiness">Platform Readiness</a><ChevronRight size={13}/><a href="/platform-readiness/initialize">Initialize</a><ChevronRight size={13}/><strong>Configuration Loading</strong></nav>
    <header className={styles.heading}><div className={styles.title}><span><FileJson2 size={25}/></span><div><small>INITIALIZE - CONTROL GROUP 01</small><h1>Configuration Loading</h1><p>Signed manifest discovery, precedence resolution, schema validation, and secret binding.</p></div></div><div className={styles.loader}><RefreshCw className={loading ? styles.spin : ""} size={16}/><span><small>{streamMode === "live" ? "REALTIME STREAM" : streamMode === "polling" ? "POLLING FALLBACK" : "CONNECTING"}</small><strong>Cycle #{snapshot?.cycle ?? 0} - {snapshot?.decision ?? "CONNECTING"} - {formatTime(snapshot?.updatedAt)}</strong></span></div></header>

    <section className={`${styles.statusBand} ${ready ? styles.statusReady : ""}`}><div>{ready ? <CheckCircle2 size={20}/> : <LockKeyhole size={20}/>}<span><small>CONFIGURATION DECISION</small><strong>{decision}</strong></span></div><p>{evidence}</p><div className={styles.stats}><span><b>{configs.length}</b>Bundles</span><span><b>{configs.reduce((sum, config) => sum + config.fields, 0)}</b>Fields</span><span><b>{counts.verified}</b>Verified</span><span><b>{counts.rejected}</b>Rejected</span></div></section>

    <div className={styles.vault}>
      <aside className={styles.manifestList}>
        <header><div><Layers3 size={17}/><span><h2>Manifest Vault</h2><p>Precedence order</p></span></div><b>{configs.length} FILES</b></header>
        <div className={styles.list}>{configs.map((config) => { const Icon = config.icon; return <button className={`${styles.manifest} ${selected === config.id ? styles.selected : ""}`} type="button" onClick={() => setSelected(config.id)} key={config.id}><span className={styles.order}>0{config.priority}</span><span className={styles.manifestIcon}><Icon size={17}/></span><span className={styles.manifestName}><strong>{config.name}</strong><small>{config.file}</small></span><span className={`${styles.state} ${styles[config.state]}`}>{stateIcon(config.state)}</span></button>; })}</div>
        <footer><GitMerge size={14}/><span>Later bundles may narrow, but never weaken, upstream safety policy.</span></footer>
      </aside>

      <section className={styles.viewer}>
        <header><div><span className={styles.fileIcon}><Code2 size={19}/></span><div><small>SELECTED MANIFEST</small><h2>{active.file}</h2></div></div><span className={`${styles.fileState} ${styles[active.state]}`}>{stateIcon(active.state)}{stateLabel(active.state)}</span></header>
        <div className={styles.tabs}><span className={styles.activeTab}>Resolved view</span><span>Source</span><span>Schema</span><span>Change history</span></div>
        <div className={styles.editor}>
          <div className={styles.lineNumbers}>{Array.from({ length: 12 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
          <pre><code>{manifestPreview(active, snapshot, configuration)}</code></pre>
          {active.state !== "verified" ? <div className={styles.editorEmpty}><AlertTriangle size={17}/><span><strong>No trusted payload resolved</strong><small>{evidence}</small></span></div> : null}
        </div>
        <div className={styles.fileMeta}><div><small>SCHEMA</small><strong>{active.schema}</strong></div><div><small>EXPECTED FIELDS</small><strong>{active.fields}</strong></div><div><small>PRECEDENCE</small><strong>0{active.priority}</strong></div><div><small>LAST VERIFIED</small><strong>{lastVerified}</strong></div></div>
        <div className={styles.purpose}><ScrollText size={15}/><span><small>MANIFEST PURPOSE</small><strong>{active.purpose}</strong></span></div>
      </section>

      <aside className={styles.provenance}>
        <header><Fingerprint size={18}/><div><h2>Trust Chain</h2><p>Required provenance evidence</p></div></header>
        <div className={styles.ring} style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><b>{progress}%</b><small>ASSESSED</small></span></div>
        <div className={styles.gates}><Gate icon={Database} title="Registry source" verified={counts.verified >= 1}/><Gate icon={KeyRound} title="Signing identity" verified={counts.verified >= 2}/><Gate icon={Fingerprint} title="Content digest" verified={counts.verified >= 3}/><Gate icon={FileCheck2} title="Schema contract" verified={counts.verified >= 4}/><Gate icon={ShieldCheck} title="Policy integrity" verified={counts.verified >= 5}/></div>
        <div className={styles.orchestrator}><Bot size={18}/><span><strong>Configuration Resolver</strong><small>Automatic - deterministic - fail closed</small></span></div>
        <dl><div><dt>Precedence</dt><dd>STRICT</dd></div><div><dt>Unknown fields</dt><dd>REJECT</dd></div><div><dt>Secret handling</dt><dd>REFERENCE ONLY</dd></div><div><dt>Manual override</dt><dd>PROHIBITED</dd></div></dl>
      </aside>
    </div>

    <section className={styles.auditBar}><div><FileClock size={16}/><span><strong>Autonomous configuration audit</strong><small>{snapshot ? `Updated ${formatDateTime(snapshot.updatedAt)} through ${streamMode}.` : "Connecting to initialization evidence."}</small></span></div><div><span>Queued</span><b>{counts.queued}</b></div><div><span>Loading</span><b>{counts.loading}</b></div><div><span>Verified</span><b>{counts.verified}</b></div><div><span>Rejected</span><b>{counts.rejected}</b></div><p><Clock3 size={13}/>{streamMode === "live" ? "Realtime initialization stream active" : "Polling every 5s until stream reconnects"}</p></section>
  </main>;
}

function mapConfigs(step?: InitializationStepSnapshot): Config[] {
  if (!step) return definitions.map((config) => ({ ...config }));
  const verified = Math.min(step.ready, definitions.length);
  return definitions.map((config, index) => ({
    ...config,
    state: step.status === "ready"
      ? "verified"
      : step.status === "running"
        ? index < verified ? "verified" : index === verified ? "loading" : "queued"
        : step.status === "blocked"
          ? index < verified ? "verified" : "rejected"
          : "queued",
  }));
}

function Gate({ icon: Icon, title, verified }: { icon: typeof FileJson2; title: string; verified: boolean }) {
  return <div><span><Icon size={13}/>{title}</span><b className={verified ? styles.gateVerified : undefined}>{verified ? <CheckCircle2 size={11}/> : <XCircle size={11}/>}{verified ? "VERIFIED" : "UNVERIFIED"}</b></div>;
}

function stateIcon(state: ConfigState) {
  if (state === "verified") return <CheckCircle2 size={12}/>;
  if (state === "loading") return <RefreshCw className={styles.spin} size={12}/>;
  if (state === "rejected") return <XCircle size={12}/>;
  return <Circle size={12}/>;
}

function stateLabel(state: ConfigState) {
  if (state === "loading") return "LOADING";
  if (state === "rejected") return "REJECTED";
  if (state === "verified") return "VERIFIED";
  return "QUEUED";
}

function manifestPreview(config: Config, snapshot: InitializationSnapshot | null, step?: InitializationStepSnapshot) {
  return JSON.stringify({
    $schema: config.schema,
    environment: "production",
    manifest: config.id,
    cycle: snapshot?.cycle ?? null,
    source: {
      stream: snapshot ? "initialization-snapshot" : "connecting",
      correlation: snapshot?.handoff?.correlationId ?? snapshot?.runtime.commandId ?? null,
      updatedAt: snapshot?.updatedAt ?? null,
    },
    validation: {
      state: config.state,
      stepStatus: step?.status ?? "connecting",
      readyControls: step?.ready ?? 0,
      requiredControls: step?.required ?? 5,
      evidence: step?.evidence ?? "Connecting to production configuration evidence.",
    },
    resolved: config.state === "verified",
  }, null, 2);
}

function formatTime(value?: string | null) {
  if (!value) return "--:--:--";
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}
