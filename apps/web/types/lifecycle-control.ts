export type LifecycleRuntimeStatus = "stopped" | "starting" | "held" | "running" | "stopping" | "error";

export type LifecycleRuntime = {
  schemaVersion: "lifecycle-control/v1";
  status: LifecycleRuntimeStatus;
  currentStage: "start" | "initialize" | "stop";
  commandSequence: number;
  commandId: string;
  correlationId: string | null;
  requestedAt: string;
  updatedAt: string;
  reason: string;
};

export type LifecycleCommandRequest = { command: "START" | "STOP" };
export type LifecycleControlResponse = { runtime: LifecycleRuntime };
