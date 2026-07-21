import type { LifecycleRuntime } from "@/types/lifecycle-control";

export type StartupHistoryOutcome = "Successful" | "Blocked" | "Failed" | "In progress";

export type StartupHistoryRecord = {
  cycleId: string;
  initiatedAt: string;
  mode: string;
  durationMs: number | null;
  outcome: StartupHistoryOutcome;
  checksPassed: number;
  checksRequired: number;
  integrityVerified: boolean;
  digest: string;
  correlationId: string;
};

export type StartupHistoryEvent = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  status: "complete" | "waiting" | "pending";
};

export type StartupHistorySnapshot = {
  schemaVersion: "startup-history/v1";
  updatedAt: string;
  source: "process-memory";
  runtime: LifecycleRuntime;
  summary: {
    recordedCycles: number;
    successfulStarts: number;
    blockedStarts: number;
    averageDurationMs: number | null;
  };
  records: StartupHistoryRecord[];
  events: StartupHistoryEvent[];
  integrity: {
    verified: number;
    failed: number;
  };
};
