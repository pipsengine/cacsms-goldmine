import { createStartInitializeHandoff } from "@/lib/server/start-initialize-handoff";
import { getAgentRegistrySnapshot } from "@/lib/server/agent-registry";
import { getConnectivitySnapshot } from "@/lib/server/connectivity-snapshot";
import { getLifecycleRuntime } from "@/lib/server/lifecycle-control";
import { getMt5LocalBridgeSnapshot } from "@/lib/server/mt5-local-bridge";
import { getSqlPool, isDatabaseConfigured } from "@/lib/server/mssql";
import type { StartCheckEvidence } from "@/types/platform-readiness-handoff";

const globalAssessment = globalThis as typeof globalThis & { __preStartAssessmentCycle?: number };
type AssessmentResult = Awaited<ReturnType<typeof runAssessment>>;
type AssessmentCache = { value: AssessmentResult | null; pending: Promise<AssessmentResult> | null; expiresAt: number };
const assessmentGlobal = globalThis as typeof globalThis & { __preStartAssessmentCache?: AssessmentCache };
const assessmentCache = assessmentGlobal.__preStartAssessmentCache ?? { value: null, pending: null, expiresAt: 0 };
assessmentGlobal.__preStartAssessmentCache = assessmentCache;

export async function assessPreStartReadiness(force = false) {
  const now = Date.now();
  if (!force && assessmentCache.value && assessmentCache.expiresAt > now) return assessmentCache.value;
  if (assessmentCache.pending) return assessmentCache.pending;

  assessmentCache.pending = runAssessment();
  try {
    const result = await assessmentCache.pending;
    assessmentCache.value = result;
    assessmentCache.expiresAt = Date.now() + 4500;
    return result;
  } finally {
    assessmentCache.pending = null;
  }
}

async function runAssessment() {
  const [connectivity, mt5, databaseReady] = await Promise.all([
    getConnectivitySnapshot(),
    getMt5LocalBridgeSnapshot(),
    checkDatabase(),
  ]);
  const runtime = getLifecycleRuntime();
  const auditStream = connectivity.services.find((service) => service.id === "audit-stream");
  const agentRegistry = getAgentRegistrySnapshot();
  const newsConfigured = Boolean(process.env.NEWS_API_URL?.trim());
  const brokerReady = Boolean(mt5?.ok && mt5.terminalConnected && mt5.accountConnected);
  const quotesReady = Boolean(mt5?.symbolSelected && mt5.bid !== null && mt5.ask !== null);
  const accountReady = Boolean(
    mt5?.accountConnected &&
      mt5.balance !== null &&
      mt5.equity !== null &&
      mt5.permissions.includes("positions") &&
      mt5.permissions.includes("orders"),
  );

  const checks: StartCheckEvidence[] = [
    evidence("database", "Production database", true, databaseReady ? "passed" : "blocked"),
    evidence("messaging", "Real-time messaging", true, auditStream?.status === "online" ? "passed" : "blocked"),
    evidence("agents", "AI agent registry", true, agentRegistry.status === "ready" && agentRegistry.registered === agentRegistry.required ? "passed" : "blocked"),
    evidence("operating-mode", "Operating mode", true, mt5?.tradeMode === "demo" || mt5?.tradeMode === "live" ? "passed" : "blocked"),
    evidence("trading-profile", "Trading profile", true, quotesReady && mt5?.symbol === "XAUUSD" ? "passed" : "blocked"),
    evidence("risk-profile", "Risk profile", true, accountReady ? "passed" : "blocked"),
    evidence("broker", "Broker and MT5 bridge", true, brokerReady ? "passed" : "blocked"),
    evidence("symbol", "Gold symbol specification", true, quotesReady ? "passed" : "blocked"),
    evidence("market-data", "Market data freshness", true, quotesReady && (mt5?.ticksPerMinute ?? 0) > 0 ? "passed" : "blocked"),
    evidence("account", "Account eligibility", true, accountReady ? "passed" : "blocked"),
    evidence("news", "News restrictions", false, newsConfigured ? "passed" : "warning"),
    evidence("emergency", "Emergency protection", true, runtime.schemaVersion === "lifecycle-control/v1" && runtime.status !== "error" ? "passed" : "blocked"),
  ];

  const cycleNumber = (globalAssessment.__preStartAssessmentCycle ?? 0) + 1;
  globalAssessment.__preStartAssessmentCycle = cycleNumber;
  const handoff = createStartInitializeHandoff({ cycleNumber, checks });

  return {
    schemaVersion: "pre-start-assessment/v1" as const,
    cycleNumber,
    validatedAt: new Date().toISOString(),
    checks,
    handoff,
  };
}

function evidence(id: string, label: string, required: boolean, status: StartCheckEvidence["status"]): StartCheckEvidence {
  return { id, label, required, status, evidenceSource: "production-adapter" };
}

async function checkDatabase() {
  if (!isDatabaseConfigured()) return false;
  try {
    const pool = await getSqlPool();
    const result = await pool.request().query("SELECT 1 AS ready");
    return result.recordset[0]?.ready === 1;
  } catch {
    return false;
  }
}
