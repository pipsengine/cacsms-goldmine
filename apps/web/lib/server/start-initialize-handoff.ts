import { createHash, randomUUID } from "node:crypto";
import type { StartAssessmentRequest, StartCheckEvidence, StartInitializeHandoff } from "@/types/platform-readiness-handoff";

type HandoffStore = { sequence: number; current: StartInitializeHandoff | null };

const globalStore = globalThis as typeof globalThis & { __startInitializeHandoff?: HandoffStore };
const store = globalStore.__startInitializeHandoff ?? { sequence: 0, current: null };
globalStore.__startInitializeHandoff = store;

const expectedChecks = new Set(["database", "messaging", "agents", "operating-mode", "trading-profile", "risk-profile", "broker", "symbol", "market-data", "account", "news", "emergency"]);

export function getStartInitializeHandoff() {
  return store.current;
}

export function createStartInitializeHandoff(assessment: StartAssessmentRequest): StartInitializeHandoff {
  const checks = normalizeChecks(assessment.checks);
  const requiredChecks = checks.filter((check) => check.required);
  const allRequiredPassed = requiredChecks.length > 0 && requiredChecks.every((check) => check.status === "passed");
  const productionEvidenceComplete = checks.length === expectedChecks.size && checks.every((check) => check.evidenceSource === "production-adapter");
  const authorized = allRequiredPassed && productionEvidenceComplete;
  const operatingVerified = isPassed(checks, "operating-mode") && productionEvidenceComplete;
  const tradingVerified = isPassed(checks, "trading-profile") && isPassed(checks, "symbol") && productionEvidenceComplete;
  const riskVerified = isPassed(checks, "risk-profile") && isPassed(checks, "account") && productionEvidenceComplete;
  const issuedAt = new Date();
  const sequence = store.sequence + 1;
  const correlationId = `start-${issuedAt.toISOString().replace(/[-:.TZ]/g, "")}-${String(sequence).padStart(4, "0")}`;
  const reasons = authorized ? [] : buildReasons(checks, allRequiredPassed, productionEvidenceComplete);

  const unsigned = {
    schemaVersion: "start-initialize/v1" as const,
    handoffId: randomUUID(),
    correlationId,
    sequence,
    sourceStage: "START" as const,
    targetStage: "INITIALIZE" as const,
    decision: authorized ? "AUTHORIZED" as const : "HOLD" as const,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + 5 * 60_000).toISOString(),
    inputs: {
      operatingMode: { value: operatingVerified ? "production" as const : null, state: operatingVerified ? "verified" as const : "unavailable" as const, source: "platform-readiness.start.operating-mode" as const },
      tradingProfile: { symbol: tradingVerified ? "XAUUSD" as const : null, sessionPolicy: tradingVerified ? "production-session-policy" : null, strategyPolicy: tradingVerified ? "approved-strategy-registry" : null, state: tradingVerified ? "verified" as const : "unavailable" as const, source: "platform-readiness.start.trading-profile" as const },
      riskProfile: { profile: "Conservative" as const, configuredRiskPerTrade: "0.50%" as const, effectiveMultiplier: riskVerified ? "1.00x" as const : "0.00x" as const, state: riskVerified ? "verified" as const : "unavailable" as const, source: "platform-readiness.start.risk-profile" as const },
      checklist: {
        cycleNumber: Math.max(1, Math.trunc(assessment.cycleNumber)),
        total: checks.length,
        required: requiredChecks.length,
        passed: checks.filter((check) => check.status === "passed").length,
        blocked: checks.filter((check) => check.status === "blocked").length,
        warning: checks.filter((check) => check.status === "warning").length,
        checks,
      },
    },
    evidence: { auditIdentity: "audit.platform-readiness.start.handoff" as const, allRequiredPassed, productionEvidenceComplete, reasons },
  };
  const handoff: StartInitializeHandoff = { ...unsigned, integrity: { algorithm: "sha256", digest: createHash("sha256").update(JSON.stringify(unsigned)).digest("hex") } };
  store.sequence = sequence;
  store.current = handoff;
  return handoff;
}

function normalizeChecks(checks: StartCheckEvidence[]) {
  if (!Array.isArray(checks)) throw new Error("checks must be an array");
  const unique = new Map<string, StartCheckEvidence>();
  for (const check of checks) {
    if (!check || !expectedChecks.has(check.id) || unique.has(check.id)) continue;
    if (!check.label || typeof check.required !== "boolean" || !["passed", "warning", "blocked"].includes(check.status)) continue;
    const evidenceSource = check.evidenceSource === "production-adapter" ? "production-adapter" : "unavailable";
    unique.set(check.id, { id: check.id, label: check.label, required: check.required, status: check.status, evidenceSource });
  }
  return [...unique.values()];
}

function isPassed(checks: StartCheckEvidence[], id: string) {
  return checks.some((check) => check.id === id && check.status === "passed" && check.evidenceSource === "production-adapter");
}

function buildReasons(checks: StartCheckEvidence[], allRequiredPassed: boolean, productionEvidenceComplete: boolean) {
  const reasons: string[] = [];
  if (checks.length !== expectedChecks.size) reasons.push(`Incomplete checklist evidence: received ${checks.length} of ${expectedChecks.size} checks.`);
  if (!allRequiredPassed) reasons.push("One or more required START checks did not pass.");
  if (!productionEvidenceComplete) reasons.push("Production evidence is incomplete or unavailable.");
  const blocked = checks.filter((check) => check.required && check.status !== "passed").map((check) => check.id);
  if (blocked.length) reasons.push(`Required checks held: ${blocked.join(", ")}.`);
  return reasons;
}
