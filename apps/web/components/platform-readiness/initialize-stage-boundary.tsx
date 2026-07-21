"use client";

import { AlertTriangle, CheckCircle2, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LifecycleControlResponse, LifecycleRuntime } from "@/types/lifecycle-control";
import type { StartInitializeHandoff, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";
import styles from "./initialize-stage-boundary.module.css";

type HandoffContextValue = { handoff: StartInitializeHandoff | null; runtime: LifecycleRuntime | null; authorized: boolean; channel: "loading" | "available" | "absent" | "error" };
const HandoffContext = createContext<HandoffContextValue>({ handoff: null, runtime: null, authorized: false, channel: "loading" });

export function useStartInitializeHandoff() {
  return useContext(HandoffContext);
}

export function InitializeStageBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [handoff, setHandoff] = useState<StartInitializeHandoff | null>(null);
  const [runtime, setRuntime] = useState<LifecycleRuntime | null>(null);
  const [channel, setChannel] = useState<HandoffContextValue["channel"]>("loading");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [handoffResponse, runtimeResponse] = await Promise.all([
          fetch("/api/platform-readiness/handoff/start-initialize", { cache: "no-store", headers: { Accept: "application/json" } }),
          fetch("/api/lifecycle-control", { cache: "no-store", headers: { Accept: "application/json" } }),
        ]);
        if (!handoffResponse.ok || !runtimeResponse.ok) throw new Error("Lifecycle boundary state unavailable");
        const payload = await handoffResponse.json() as StartInitializeHandoffResponse;
        const lifecycle = await runtimeResponse.json() as LifecycleControlResponse;
        if (!active) return;
        setHandoff(payload.handoff);
        setRuntime(lifecycle.runtime);
        setChannel(payload.handoff ? "available" : "absent");
      } catch {
        if (!active) return;
        setHandoff(null);
        setChannel("error");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const authorized = Boolean(runtime?.status === "running" && runtime.currentStage === "initialize" && handoff && handoff.schemaVersion === "start-initialize/v1" && handoff.sourceStage === "START" && handoff.targetStage === "INITIALIZE" && handoff.decision === "AUTHORIZED" && Date.parse(handoff.expiresAt) > Date.now());
  const value = useMemo(() => ({ handoff, runtime, authorized, channel }), [handoff, runtime, authorized, channel]);
  const isReadOnlyMonitor = pathname === "/platform-readiness/initialize" || pathname === "/platform-readiness/initialize/engine-initialization" || pathname === "/platform-readiness/initialize/ai-agent-initialization" || pathname === "/platform-readiness/initialize/service-initialization" || pathname === "/platform-readiness/initialize/dependency-monitor";

  if (hydrated && isReadOnlyMonitor) return <HandoffContext.Provider value={value}>{children}</HandoffContext.Provider>;
  if (authorized) return <HandoffContext.Provider value={value}>{children}</HandoffContext.Provider>;

  return <main className={styles.page}>
    <section className={styles.gateCard}>
      <div className={styles.icon}>{channel === "loading" ? <RefreshCw className={styles.spin} size={30} /> : <LockKeyhole size={30} />}</div>
      <small>STAGE 1 → STAGE 2 CONTROL BOUNDARY</small>
      <h1>{channel === "loading" ? "Validating START handoff" : "INITIALIZE workspace locked"}</h1>
      <p>{channel === "error" ? "The lifecycle control channel is unavailable. This workspace remains fail-closed while the orchestrator retries." : runtime?.status === "stopped" ? "The Trading System Lifecycle is stopped. Use the top-bar Start control to request autonomous startup." : channel === "absent" ? "START has not published an authorization envelope. Complete autonomous START validation before entering this workspace." : "The latest START envelope was received with HOLD. Production evidence is incomplete, so this workspace cannot execute."}</p>
      <div className={styles.decision}>{channel === "loading" ? <RefreshCw className={styles.spin} size={15} /> : <ShieldCheck size={15} />}<span><small>LIFECYCLE / HANDOFF DECISION</small><strong>{channel === "loading" ? "CHECKING" : `${runtime?.status.toUpperCase() ?? "UNKNOWN"} · ${handoff?.decision ?? "NO HANDOFF"}`}</strong></span></div>
      {handoff ? <dl><div><dt>Lifecycle</dt><dd>{runtime?.status ?? "unavailable"}</dd></div><div><dt>Correlation</dt><dd>{handoff.correlationId}</dd></div><div><dt>Operating mode</dt><dd>{handoff.inputs.operatingMode.state}</dd></div><div><dt>Trading profile</dt><dd>{handoff.inputs.tradingProfile.state}</dd></div><div><dt>Risk profile</dt><dd>{handoff.inputs.riskProfile.state}</dd></div><div><dt>Required checks</dt><dd>{handoff.inputs.checklist.passed}/{handoff.inputs.checklist.required} passed</dd></div><div><dt>Integrity</dt><dd>{handoff.integrity.algorithm.toUpperCase()} · {handoff.integrity.digest.slice(0, 12)}…</dd></div></dl> : null}
      <div className={styles.policy}><AlertTriangle size={15}/><span>Direct route access cannot bypass lifecycle authorization. No Stage 2 component has been mounted.</span></div>
      <div className={styles.links}><a href="/platform-readiness/start/pre-start-checklist"><FileCheck2 size={14}/>View START evidence</a><a href="/platform-readiness/initialize"><CheckCircle2 size={14}/>View handoff monitor</a></div>
    </section>
  </main>;
}
