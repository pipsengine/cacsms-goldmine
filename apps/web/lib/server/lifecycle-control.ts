import { randomUUID } from "node:crypto";
import { getStartInitializeHandoff } from "@/lib/server/start-initialize-handoff";
import type { LifecycleRuntime } from "@/types/lifecycle-control";

type RuntimeStore = { current: LifecycleRuntime };
const now = new Date().toISOString();
const globalStore = globalThis as typeof globalThis & { __tradingLifecycleRuntime?: RuntimeStore };
const store = globalStore.__tradingLifecycleRuntime ?? {
  current: {
    schemaVersion: "lifecycle-control/v1",
    status: "stopped",
    currentStage: "stop",
    commandSequence: 0,
    commandId: "system-initial-state",
    correlationId: null,
    requestedAt: now,
    updatedAt: now,
    reason: "Trading System Lifecycle is stopped.",
  },
};
globalStore.__tradingLifecycleRuntime = store;

export function getLifecycleRuntime() {
  reconcileAuthorizedHandoff();
  return store.current;
}

export function commandLifecycle(command: "START" | "STOP") {
  if (command === "STOP") return stopLifecycle();
  return startLifecycle();
}

function startLifecycle() {
  const current = store.current;
  if (["starting", "held", "running"].includes(current.status)) {
    reconcileAuthorizedHandoff();
    return store.current;
  }
  const requestedAt = new Date().toISOString();
  const handoff = getStartInitializeHandoff();
  const authorized = isAuthorized(handoff);
  store.current = {
    schemaVersion: "lifecycle-control/v1",
    status: authorized ? "running" : "held",
    currentStage: authorized ? "initialize" : "start",
    commandSequence: current.commandSequence + 1,
    commandId: randomUUID(),
    correlationId: handoff?.correlationId ?? null,
    requestedAt,
    updatedAt: requestedAt,
    reason: authorized ? "START authorization accepted. INITIALIZE is active." : handoff ? `START requested; handoff ${handoff.decision}. Awaiting complete production evidence.` : "START requested; awaiting the Stage 1 assessment handoff.",
  };
  return store.current;
}

function stopLifecycle() {
  const current = store.current;
  if (current.status === "stopped") return current;
  const requestedAt = new Date().toISOString();
  store.current = {
    schemaVersion: "lifecycle-control/v1",
    status: "stopped",
    currentStage: "stop",
    commandSequence: current.commandSequence + 1,
    commandId: randomUUID(),
    correlationId: current.correlationId,
    requestedAt,
    updatedAt: requestedAt,
    reason: "STOP command accepted. Lifecycle progression and Stage 2 execution are disabled.",
  };
  return store.current;
}

function reconcileAuthorizedHandoff() {
  const current = store.current;
  if (current.status !== "held" && current.status !== "starting") return;
  const handoff = getStartInitializeHandoff();
  if (!isAuthorized(handoff)) return;
  store.current = {
    ...current,
    status: "running",
    currentStage: "initialize",
    correlationId: handoff?.correlationId ?? current.correlationId,
    updatedAt: new Date().toISOString(),
    reason: "START handoff became authorized. Lifecycle advanced autonomously to INITIALIZE.",
  };
}

function isAuthorized(handoff: ReturnType<typeof getStartInitializeHandoff>) {
  return Boolean(handoff && handoff.decision === "AUTHORIZED" && Date.parse(handoff.expiresAt) > Date.now());
}
