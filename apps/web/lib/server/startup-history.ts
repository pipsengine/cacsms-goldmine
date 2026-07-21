import { createHash } from "node:crypto";
import { getLifecycleRuntime } from "@/lib/server/lifecycle-control";
import { getStartInitializeHandoffHistory } from "@/lib/server/start-initialize-handoff";
import type { StartInitializeHandoff } from "@/types/platform-readiness-handoff";
import type { StartupHistoryRecord, StartupHistorySnapshot } from "@/types/startup-history";

export function getStartupHistorySnapshot(): StartupHistorySnapshot {
  const runtime = getLifecycleRuntime();
  const handoffs = getStartInitializeHandoffHistory().sort((left, right) => Date.parse(right.issuedAt) - Date.parse(left.issuedAt));
  const records = handoffs.map(toRecord);
  const successful = records.filter((record) => record.outcome === "Successful");
  const durations = successful.flatMap((record) => record.durationMs === null ? [] : [record.durationMs]);

  return {
    schemaVersion: "startup-history/v1",
    updatedAt: new Date().toISOString(),
    source: "process-memory",
    runtime,
    summary: {
      recordedCycles: records.length,
      successfulStarts: successful.length,
      blockedStarts: records.filter((record) => record.outcome === "Blocked").length,
      averageDurationMs: durations.length ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length) : null,
    },
    records,
    events: [
      {
        id: `runtime-${runtime.commandId}-${runtime.updatedAt}`,
        timestamp: runtime.updatedAt,
        title: `Lifecycle ${titleCase(runtime.status)}`,
        detail: runtime.reason,
        status: runtime.status === "running" ? "complete" : runtime.status === "held" ? "waiting" : "pending",
      },
      ...handoffs.slice(0, 7).map((handoff) => ({
        id: handoff.handoffId,
        timestamp: handoff.issuedAt,
        title: `START assessment #${handoff.inputs.checklist.cycleNumber}`,
        detail: `${handoff.decision}: ${handoff.inputs.checklist.passed}/${handoff.inputs.checklist.required} required checks passed.`,
        status: handoff.decision === "AUTHORIZED" ? "complete" as const : "waiting" as const,
      })),
    ],
    integrity: {
      verified: records.filter((record) => record.integrityVerified).length,
      failed: records.filter((record) => !record.integrityVerified).length,
    },
  };
}

function toRecord(handoff: StartInitializeHandoff): StartupHistoryRecord {
  return {
    cycleId: `START-${String(handoff.inputs.checklist.cycleNumber).padStart(4, "0")}`,
    initiatedAt: handoff.issuedAt,
    mode: handoff.inputs.operatingMode.value ?? "Unavailable",
    durationMs: null,
    outcome: handoff.decision === "AUTHORIZED" ? "Successful" : "Blocked",
    checksPassed: handoff.inputs.checklist.passed,
    checksRequired: handoff.inputs.checklist.required,
    integrityVerified: verifyIntegrity(handoff),
    digest: handoff.integrity.digest,
    correlationId: handoff.correlationId,
  };
}

function verifyIntegrity(handoff: StartInitializeHandoff) {
  const { integrity, ...unsigned } = handoff;
  return createHash("sha256").update(JSON.stringify(unsigned)).digest("hex") === integrity.digest;
}

function titleCase(value: string) {
  return value.replace(/(^|[-_\s])\w/g, (character) => character.toUpperCase());
}
