import type { LifecycleRuntime } from "@/types/lifecycle-control";
import type { StartInitializeHandoff } from "@/types/platform-readiness-handoff";

export type InitializationStatus = "pending" | "running" | "ready" | "blocked";

export type InitializationStepSnapshot = {
  id: "configuration" | "engines" | "agents" | "services" | "dependencies" | "audit";
  status: InitializationStatus;
  ready: number;
  required: number;
  evidence: string;
};

export type InitializationSnapshot = {
  schemaVersion: "initialization/v1";
  updatedAt: string;
  cycle: number;
  runtime: LifecycleRuntime;
  handoff: StartInitializeHandoff | null;
  handoffAuthorized: boolean;
  steps: InitializationStepSnapshot[];
  progress: number;
  canAdvance: boolean;
  decision: "ADVANCE" | "INITIALIZING" | "HOLD";
  message: string;
  connectivityScore: number;
  activity: Array<{ id: string; message: string; timestamp: string }>;
};
