import { createHash } from "node:crypto";
import { getAgentRegistrySnapshot } from "@/lib/server/agent-registry";
import { getConnectivitySnapshot } from "@/lib/server/connectivity-snapshot";
import { getLifecycleRuntime } from "@/lib/server/lifecycle-control";
import { getStartInitializeHandoff } from "@/lib/server/start-initialize-handoff";
import type { StartInitializeHandoff } from "@/types/platform-readiness-handoff";
import type { InitializationSnapshot, InitializationStatus, InitializationStepSnapshot } from "@/types/initialization";

type InitializationCache = { value: InitializationSnapshot | null; pending: Promise<InitializationSnapshot> | null; expiresAt: number };
const cacheGlobal = globalThis as typeof globalThis & { __initializationSnapshotCache?: InitializationCache };
const cache = cacheGlobal.__initializationSnapshotCache ?? { value: null, pending: null, expiresAt: 0 };
cacheGlobal.__initializationSnapshotCache = cache;

export async function getInitializationSnapshot(): Promise<InitializationSnapshot> {
  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache.pending) return cache.pending;
  cache.pending = buildInitializationSnapshot();
  try {
    const snapshot = await cache.pending;
    cache.value = snapshot;
    cache.expiresAt = Date.now() + 4500;
    return snapshot;
  } finally {
    cache.pending = null;
  }
}

async function buildInitializationSnapshot(): Promise<InitializationSnapshot> {
  const [connectivity, agents] = await Promise.all([getConnectivitySnapshot(), Promise.resolve(getAgentRegistrySnapshot())]);
  const runtime = getLifecycleRuntime();
  const handoff = getStartInitializeHandoff();
  const integrityValid = Boolean(handoff && verifyHandoff(handoff));
  const handoffAuthorized = Boolean(
    handoff && integrityValid && handoff.decision === "AUTHORIZED" && Date.parse(handoff.expiresAt) > Date.now(),
  );
  const initializeActive = runtime.status === "running" && runtime.currentStage === "initialize" && handoffAuthorized;
  const inputsReady = handoff ? [handoff.inputs.operatingMode.state, handoff.inputs.tradingProfile.state, handoff.inputs.riskProfile.state].filter((state) => state === "verified").length : 0;
  const onlineServices = connectivity.services.filter((service) => service.status === "online").length;
  const engineAdapterConfigured = Boolean(process.env.INITIALIZATION_ENGINE_HEALTH_URL?.trim());

  const steps: InitializationStepSnapshot[] = [
    step("configuration", initializeActive ? (inputsReady === 3 ? "ready" : "blocked") : handoffAuthorized ? "pending" : "blocked", inputsReady + (integrityValid ? 1 : 0) + (handoffAuthorized ? 1 : 0), 5, handoff ? `${inputsReady}/3 stage inputs verified; handoff integrity ${integrityValid ? "verified" : "failed"}.` : "No START handoff is available."),
    step("engines", initializeActive ? (engineAdapterConfigured ? "running" : "blocked") : handoffAuthorized ? "pending" : "blocked", initializeActive ? 1 : 0, 5, engineAdapterConfigured ? "Engine health adapter configured; awaiting all engine heartbeats." : "No production initialization-engine health adapter is configured."),
    step("agents", initializeActive && agents.status === "ready" ? "ready" : handoffAuthorized ? "pending" : "blocked", agents.registered, agents.required, `${agents.registered}/${agents.required} governed agent manifests registered; digest ${agents.manifestDigest.slice(0, 12)}.`),
    step("services", initializeActive ? (onlineServices === connectivity.services.length ? "ready" : "blocked") : handoffAuthorized ? "pending" : "blocked", onlineServices, connectivity.services.length, `${onlineServices}/${connectivity.services.length} production services online; readiness ${connectivity.readinessScore}%.`),
    step("dependencies", "pending", 0, 8, "Dependency resolution waits for configuration, engines, agents, and services to become ready."),
    step("audit", initializeActive ? "ready" : handoffAuthorized ? "pending" : "blocked", initializeActive ? 1 : 0, 1, "Realtime initialization snapshots and lifecycle correlation are available."),
  ];

  const prerequisiteReady = steps.slice(0, 4).every((item) => item.status === "ready");
  steps[4] = step("dependencies", prerequisiteReady ? "ready" : initializeActive ? "blocked" : handoffAuthorized ? "pending" : "blocked", prerequisiteReady ? 8 : 0, 8, prerequisiteReady ? "All initialization dependencies resolved in order." : "One or more upstream initialization groups are not ready.");
  const canAdvance = initializeActive && steps.every((item) => item.status === "ready");
  const checked = steps.filter((item) => item.status === "ready" || item.status === "blocked").length;
  const decision = canAdvance ? "ADVANCE" : initializeActive ? "INITIALIZING" : "HOLD";

  return {
    schemaVersion: "initialization/v1",
    updatedAt: new Date().toISOString(),
    cycle: Math.max(runtime.commandSequence, handoff?.sequence ?? 0),
    runtime,
    handoff,
    handoffAuthorized,
    steps,
    progress: Math.round((checked / steps.length) * 100),
    canAdvance,
    decision,
    message: buildMessage(runtime, handoff, handoffAuthorized, initializeActive, steps),
    connectivityScore: connectivity.readinessScore,
    activity: [
      { id: `runtime-${runtime.commandId}`, message: runtime.reason, timestamp: runtime.updatedAt },
      ...(handoff ? [{ id: handoff.handoffId, message: `START handoff ${handoff.decision}; ${handoff.inputs.checklist.passed}/${handoff.inputs.checklist.required} required checks passed.`, timestamp: handoff.issuedAt }] : []),
      { id: `connectivity-${connectivity.correlationId}`, message: `Connectivity readiness ${connectivity.readinessScore}%; ${onlineServices}/${connectivity.services.length} services online.`, timestamp: connectivity.generatedAt },
    ],
  };
}

function step(id: InitializationStepSnapshot["id"], status: InitializationStatus, ready: number, required: number, evidence: string): InitializationStepSnapshot {
  return { id, status, ready, required, evidence };
}

function verifyHandoff(handoff: StartInitializeHandoff) {
  const { integrity, ...unsigned } = handoff;
  return createHash("sha256").update(JSON.stringify(unsigned)).digest("hex") === integrity.digest;
}

function buildMessage(runtime: ReturnType<typeof getLifecycleRuntime>, handoff: StartInitializeHandoff | null, authorized: boolean, active: boolean, steps: InitializationStepSnapshot[]) {
  if (runtime.status === "stopped") return "The Trading System Lifecycle is stopped. INITIALIZE remains disabled until START begins a new authorized lifecycle.";
  if (!handoff) return "No START handoff is available. INITIALIZE remains fail-closed.";
  if (!authorized) return `START handoff ${handoff.correlationId} is not currently authorized or has expired.`;
  if (!active) return `Authorized handoff ${handoff.correlationId} is ready; waiting for lifecycle stage INITIALIZE.`;
  const blocked = steps.filter((item) => item.status === "blocked");
  return blocked.length ? `INITIALIZE is active with ${blocked.length} blocked group${blocked.length === 1 ? "" : "s"}: ${blocked.map((item) => item.id).join(", ")}.` : "Initialization evidence is live and all groups are progressing.";
}
