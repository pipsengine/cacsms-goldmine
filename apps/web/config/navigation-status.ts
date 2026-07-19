export type NavigationStatusColor = "grey" | "blue" | "amber" | "green" | "red" | "purple" | "teal" | "black";

export const navigationStatusIndicators: Record<string, { label: string; color: NavigationStatusColor; value?: string }> = {
  "platform-readiness.status": { label: "82%", color: "green", value: "82%" },
  "market-intelligence.status": { label: "Analysing", color: "blue" },
  "strategy-opportunity.status": { label: "3 opportunities", color: "purple" },
  "risk-execution.status": { label: "1 pending", color: "amber" },
  "trade-operations.status": { label: "5 active positions", color: "teal" },
  "performance-control.status": { label: "Learning", color: "purple" },
  "executive.status": { label: "Monitoring", color: "blue" },
  "administration.status": { label: "Disabled", color: "grey" },
};
