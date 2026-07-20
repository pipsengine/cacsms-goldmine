import { lifecycleSnapshot } from "@/features/executive/lifecycle-command-centre-data";
import { getLifecycleRuntime } from "@/lib/server/lifecycle-control";
import type { LifecycleSnapshot, LifecycleStatus } from "@/types/lifecycle";

export function getControlledLifecycleSnapshot(): LifecycleSnapshot {
  const runtime = getLifecycleRuntime();
  const currentStageKey = runtime.currentStage;
  const progress = runtime.status === "running" ? 6 : 0;

  return {
    ...lifecycleSnapshot,
    updatedAt: runtime.updatedAt,
    progress,
    currentStageKey,
    kpis: lifecycleSnapshot.kpis.map((kpi, index) => {
      if (index === 0) return {
        ...kpi,
        value: `${progress}%`,
        helper: runtime.reason,
        trend: runtime.status === "running" ? [0, 1, 2, 3, 4, 5, 6] : [0, 0, 0, 0, 0, 0, 0],
      };
      if (kpi.label === "Active Workflows" && runtime.status !== "running") return { ...kpi, value: "0", helper: "Lifecycle execution disabled", trend: [0, 0, 0, 0, 0, 0, 0, 0] };
      if (kpi.label === "System Health" && runtime.status !== "running") return { ...kpi, value: runtime.status === "stopped" ? "Stopped" : "Held", helper: runtime.reason, tone: "orange" as const, trend: [0, 0, 0, 0, 0, 0, 0] };
      return kpi;
    }),
    stages: lifecycleSnapshot.stages.map((stage) => {
      const status = stageStatus(stage.key, runtime.status, currentStageKey);
      const active = stage.key === currentStageKey;
      const completed = status === "completed";
      return {
        ...stage,
        status,
        progress: completed ? 100 : active && runtime.status === "running" ? 6 : 0,
        readiness: completed ? 100 : active && runtime.status === "running" ? 6 : 0,
        startedAt: active ? new Date(runtime.requestedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : undefined,
        elapsed: undefined,
        estimatedCompletion: undefined,
        pages: stage.pages.map((page) => ({ ...page, status: pageStatus(stage.key, status, page.status) })),
      };
    }),
    activity: [
      {
        id: `lifecycle-command-${runtime.commandSequence}`,
        time: new Date(runtime.updatedAt).toLocaleTimeString("en-GB", { hour12: false }),
        message: runtime.reason,
        tone: runtime.status === "running" ? "success" : runtime.status === "held" ? "warning" : "info",
      },
      ...lifecycleSnapshot.activity,
    ],
  };
}

function stageStatus(key: string, runtimeStatus: string, currentStageKey: string): LifecycleStatus {
  if (runtimeStatus === "stopped") return key === "stop" ? "completed" : "not-started";
  if (runtimeStatus === "held" || runtimeStatus === "starting") return key === "start" ? "blocked" : "pending";
  if (runtimeStatus === "error") return key === currentStageKey ? "failed" : "pending";
  if (runtimeStatus === "stopping") return key === "stop" ? "in-progress" : "pending";
  if (key === "start") return "completed";
  if (key === "initialize") return "in-progress";
  return "pending";
}

function pageStatus(stageKey: string, stageStatusValue: LifecycleStatus, fallback: LifecycleStatus): LifecycleStatus {
  if (stageStatusValue === "completed") return "completed";
  if (stageStatusValue === "not-started") return "not-started";
  if (stageStatusValue === "blocked") return stageKey === "start" ? fallback : "blocked";
  if (stageStatusValue === "in-progress") return "pending";
  return stageStatusValue;
}
