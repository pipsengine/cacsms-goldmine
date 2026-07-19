export type LifecycleStatus =
  | "not-started"
  | "pending"
  | "in-progress"
  | "completed"
  | "warning"
  | "blocked"
  | "failed";

export interface StagePage {
  id: string;
  title: string;
  description: string;
  href: string;
  status: LifecycleStatus;
  icon: string;
}

export interface LifecycleStage {
  id: number;
  key: string;
  name: string;
  group: string;
  status: LifecycleStatus;
  progress: number;
  summary: string;
  startedAt?: string;
  elapsed?: string;
  estimatedCompletion?: string;
  readiness?: number;
  pages: StagePage[];
  inputs: string[];
  outputs: string[];
}

export interface LifecycleKpi {
  label: string;
  value: string;
  helper: string;
  tone: "violet" | "blue" | "green" | "amber" | "orange";
  trend: number[];
}

export interface LifecycleSnapshot {
  updatedAt: string;
  symbol: string;
  price: string;
  priceChange: string;
  accountMode: string;
  progress: number;
  currentStageKey: string;
  kpis: LifecycleKpi[];
  stages: LifecycleStage[];
  activity: {
    id: string;
    time: string;
    message: string;
    tone: "success" | "info" | "warning";
  }[];
}
