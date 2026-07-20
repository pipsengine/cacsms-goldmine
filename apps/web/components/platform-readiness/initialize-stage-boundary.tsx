"use client";

import { AlertTriangle, CheckCircle2, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { StartInitializeHandoff, StartInitializeHandoffResponse } from "@/types/platform-readiness-handoff";
import styles from "./initialize-stage-boundary.module.css";

type HandoffContextValue = { handoff: StartInitializeHandoff | null; authorized: boolean; channel: "loading" | "available" | "absent" | "error" };
const HandoffContext = createContext<HandoffContextValue>({ handoff: null, authorized: false, channel: "loading" });

export function useStartInitializeHandoff() {
  return useContext(HandoffContext);
}

export function InitializeStageBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [handoff, setHandoff] = useState<StartInitializeHandoff | null>(null);
  const [channel, setChannel] = useState<HandoffContextValue["channel"]>("loading");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/platform-readiness/handoff/start-initialize", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Handoff request failed with ${response.status}`);
        const payload = await response.json() as StartInitializeHandoffResponse;
        if (!active) return;
        setHandoff(payload.handoff);
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

  const authorized = Boolean(handoff && handoff.schemaVersion === "start-initialize/v1" && handoff.sourceStage === "START" && handoff.targetStage === "INITIALIZE" && handoff.decision === "AUTHORIZED" && Date.parse(handoff.expiresAt) > Date.now());
  const value = useMemo(() => ({ handoff, authorized, channel }), [handoff, authorized, channel]);
  const isStageRoot = pathname === "/platform-readiness/initialize";

  if (isStageRoot) return <HandoffContext.Provider value={value}>{children}</HandoffContext.Provider>;
  if (authorized) return <HandoffContext.Provider value={value}>{children}</HandoffContext.Provider>;

  return <main className={styles.page}>
    <section className={styles.gateCard}>
      <div className={styles.icon}>{channel === "loading" ? <RefreshCw className={styles.spin} size={30} /> : <LockKeyhole size={30} />}</div>
      <small>STAGE 1 → STAGE 2 CONTROL BOUNDARY</small>
      <h1>{channel === "loading" ? "Validating START handoff" : "INITIALIZE workspace locked"}</h1>
      <p>{channel === "error" ? "The handoff channel is unavailable. This workspace remains fail-closed while the lifecycle orchestrator retries." : channel === "absent" ? "START has not published an authorization envelope. Complete autonomous START validation before entering this workspace." : "The latest START envelope was received with HOLD. Production evidence is incomplete, so this workspace cannot execute."}</p>
      <div className={styles.decision}>{channel === "loading" ? <RefreshCw className={styles.spin} size={15} /> : <ShieldCheck size={15} />}<span><small>SERVER DECISION</small><strong>{channel === "loading" ? "CHECKING" : handoff?.decision ?? "NO HANDOFF"}</strong></span></div>
      {handoff ? <dl><div><dt>Correlation</dt><dd>{handoff.correlationId}</dd></div><div><dt>Operating mode</dt><dd>{handoff.inputs.operatingMode.state}</dd></div><div><dt>Trading profile</dt><dd>{handoff.inputs.tradingProfile.state}</dd></div><div><dt>Risk profile</dt><dd>{handoff.inputs.riskProfile.state}</dd></div><div><dt>Required checks</dt><dd>{handoff.inputs.checklist.passed}/{handoff.inputs.checklist.required} passed</dd></div><div><dt>Integrity</dt><dd>{handoff.integrity.algorithm.toUpperCase()} · {handoff.integrity.digest.slice(0, 12)}…</dd></div></dl> : null}
      <div className={styles.policy}><AlertTriangle size={15}/><span>Direct route access cannot bypass lifecycle authorization. No Stage 2 component has been mounted.</span></div>
      <div className={styles.links}><a href="/platform-readiness/start/pre-start-checklist"><FileCheck2 size={14}/>View START evidence</a><a href="/platform-readiness/initialize"><CheckCircle2 size={14}/>View handoff monitor</a></div>
    </section>
  </main>;
}
