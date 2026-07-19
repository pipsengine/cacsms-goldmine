import type { LifecycleStage } from "./navigation";

export const lifecycleStages: Record<LifecycleStage, { label: string; area: string; order: number }> = {
  monitor: { label: "Monitor", area: "Executive Command Centre", order: 0 },
  start: { label: "START", area: "Platform Readiness", order: 1 },
  initialize: { label: "INITIALIZE", area: "Platform Readiness", order: 2 },
  connect: { label: "CONNECT", area: "Platform Readiness", order: 3 },
  validate: { label: "VALIDATE", area: "Platform Readiness", order: 4 },
  synchronize: { label: "SYNCHRONIZE", area: "Platform Readiness", order: 5 },
  analyse: { label: "ANALYSE", area: "Gold Market Intelligence", order: 6 },
  plan: { label: "PLAN", area: "Trading Strategy and Opportunity", order: 7 },
  scan: { label: "SCAN", area: "Trading Strategy and Opportunity", order: 8 },
  qualify: { label: "QUALIFY", area: "Trading Strategy and Opportunity", order: 9 },
  authorize: { label: "AUTHORIZE", area: "Risk, Authorization and Execution", order: 10 },
  execute: { label: "EXECUTE", area: "Risk, Authorization and Execution", order: 11 },
  manage: { label: "MANAGE", area: "Position and Trade Operations", order: 12 },
  close: { label: "CLOSE", area: "Position and Trade Operations", order: 13 },
  review: { label: "REVIEW", area: "Performance, Learning and Control", order: 14 },
  learn: { label: "LEARN", area: "Performance, Learning and Control", order: 15 },
  repeat: { label: "REPEAT", area: "Performance, Learning and Control", order: 16 },
  stop: { label: "STOP", area: "Performance, Learning and Control", order: 17 },
  governance: { label: "GOVERNANCE", area: "Platform Administration", order: 18 },
};

export const currentLifecycleStage: LifecycleStage = "analyse";
