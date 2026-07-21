import { createHash } from "node:crypto";

type AgentDomain = "orchestration" | "intelligence" | "decision" | "execution" | "learning";

type AgentManifest = {
  id: string;
  domain: AgentDomain;
  authority: string;
  bindings: readonly string[];
};

const requiredAgents: readonly AgentManifest[] = [
  { id: "lifecycle-orchestrator", domain: "orchestration", authority: "lifecycle-engine", bindings: ["stage-state", "event-bus", "recovery"] },
  { id: "market-data-sentinel", domain: "intelligence", authority: "market-services", bindings: ["price-feeds", "quality-rules", "quarantine"] },
  { id: "market-analysis-agent", domain: "intelligence", authority: "intelligence-engine", bindings: ["indicators", "structure", "regime"] },
  { id: "news-intelligence-agent", domain: "intelligence", authority: "news-intelligence", bindings: ["news-feed", "calendar", "event-policy"] },
  { id: "strategy-selection-agent", domain: "decision", authority: "strategy-policy", bindings: ["registry", "eligibility", "confidence"] },
  { id: "risk-guardian-agent", domain: "decision", authority: "risk-authority", bindings: ["risk-profile", "limits", "veto"] },
  { id: "trade-decision-agent", domain: "decision", authority: "decision-policy", bindings: ["evidence", "schema", "rationale"] },
  { id: "execution-controller", domain: "execution", authority: "execution-engine", bindings: ["broker-tools", "orders", "reconcile"] },
  { id: "position-supervisor", domain: "execution", authority: "position-controls", bindings: ["positions", "exit-rules", "escalation"] },
  { id: "performance-review-agent", domain: "learning", authority: "review-engine", bindings: ["ledger", "attribution", "compliance"] },
  { id: "learning-curator-agent", domain: "learning", authority: "learning-engine", bindings: ["memory", "drift-guard", "policy"] },
] as const;

export function getAgentRegistrySnapshot() {
  const ids = new Set(requiredAgents.map((agent) => agent.id));
  const invalid = requiredAgents.filter((agent) => !agent.id || !agent.authority || agent.bindings.length === 0);
  const valid = ids.size === requiredAgents.length && invalid.length === 0;

  return {
    schemaVersion: "agent-registry/v1" as const,
    status: valid ? "ready" as const : "invalid" as const,
    required: requiredAgents.length,
    registered: valid ? requiredAgents.length : requiredAgents.length - invalid.length,
    manifestDigest: createHash("sha256").update(JSON.stringify(requiredAgents)).digest("hex"),
    checkedAt: new Date().toISOString(),
  };
}
