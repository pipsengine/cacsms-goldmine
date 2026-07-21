import { lifecycleSnapshot } from "@/features/executive/lifecycle-command-centre-data";
import { getConnectivitySnapshot } from "@/lib/server/connectivity-snapshot";
import { getLifecycleRuntime } from "@/lib/server/lifecycle-control";
import { getMt5LocalBridgeSnapshot } from "@/lib/server/mt5-local-bridge";
import type { LifecycleSnapshot, LifecycleStatus } from "@/types/lifecycle";

export async function getControlledLifecycleSnapshot(): Promise<LifecycleSnapshot> {
  const [connectivity, mt5] = await Promise.all([getConnectivitySnapshot(), getMt5LocalBridgeSnapshot()]);
  const runtime = getLifecycleRuntime();
  const currentStageKey = runtime.currentStage;
  const progress = runtime.status === "running" ? 6 : 0;
  const now = new Date();
  const riskExposure = mt5?.equity && mt5.margin !== null ? Math.round((mt5.margin / mt5.equity) * 100) : 0;
  const equity = mt5?.equity ?? null;
  const positions = mt5?.positionsTotal ?? null;
  const health = connectivity.readinessScore;

  return {
    ...lifecycleSnapshot,
    updatedAt: now.toISOString(),
    symbol: connectivity.marketData.symbol,
    price: connectivity.marketData.bid?.toFixed(2) ?? "n/a",
    priceChange: connectivity.marketData.ask !== null ? `Ask ${connectivity.marketData.ask.toFixed(2)} · spread ${connectivity.marketData.spread?.toFixed(2) ?? "n/a"}` : "Live quote unavailable",
    accountMode: `${titleCase(connectivity.broker.tradeMode)} Account`,
    progress,
    currentStageKey,
    kpis: lifecycleSnapshot.kpis.map((kpi, index) => {
      if (index === 0) return {
        ...kpi,
        value: `${progress}%`,
        helper: runtime.reason,
        trend: runtime.status === "running" ? [0, 1, 2, 3, 4, 5, 6] : [0, 0, 0, 0, 0, 0, 0],
      };
      if (kpi.label === "Active Workflows") return { ...kpi, value: runtime.status === "running" ? "1" : "0", helper: runtime.status === "running" ? "Lifecycle orchestration active" : "Lifecycle execution disabled", trend: Array(8).fill(runtime.status === "running" ? 1 : 0) };
      if (kpi.label === "Open Positions") return { ...kpi, value: positions === null ? "n/a" : String(positions), helper: mt5?.ok ? `${mt5.symbol} broker positions` : "MT5 position evidence unavailable", trend: Array(7).fill(positions ?? 0), tone: mt5?.ok ? "green" as const : "orange" as const };
      if (kpi.label === "Today's P&L") return { ...kpi, value: "n/a", helper: "Realized P&L adapter not configured", trend: [0, 0, 0, 0, 0, 0, 0, 0], tone: "orange" as const };
      if (kpi.label === "Account Equity") return { ...kpi, value: equity === null ? "n/a" : `${equity.toFixed(2)} ${mt5?.currency ?? ""}`.trim(), helper: mt5?.accountConnected ? `Account ${mt5.accountLogin}` : "Account evidence unavailable", trend: Array(7).fill(equity ?? 0) };
      if (kpi.label === "Risk Exposure") return { ...kpi, value: `${riskExposure}%`, helper: equity === null ? "Account evidence unavailable" : `${mt5?.margin?.toFixed(2) ?? "0.00"} margin in use`, trend: Array(7).fill(riskExposure) };
      if (kpi.label === "System Health") return { ...kpi, value: `${health}%`, helper: `${titleCase(connectivity.overallStatus)} · ${connectivity.services.filter((service) => service.status === "online").length}/${connectivity.services.length} services online`, tone: connectivity.overallStatus === "online" ? "green" as const : "orange" as const, trend: Array(7).fill(health) };
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
      {
        id: `mt5-${mt5?.accountLogin ?? "unbound"}`,
        time: now.toLocaleTimeString("en-GB", { hour12: false }),
        message: mt5?.ok ? `MT5 account ${mt5.accountLogin} connected to ${mt5.server}.` : mt5?.error ?? "MT5 evidence unavailable.",
        tone: mt5?.ok ? "success" : "warning",
      },
      {
        id: `market-${connectivity.generatedAt}`,
        time: now.toLocaleTimeString("en-GB", { hour12: false }),
        message: `${connectivity.marketData.symbol} ${connectivity.marketData.status}: ${connectivity.marketData.bid?.toFixed(2) ?? "n/a"} / ${connectivity.marketData.ask?.toFixed(2) ?? "n/a"}.`,
        tone: connectivity.marketData.status === "online" ? "success" : "warning",
      },
      {
        id: `health-${connectivity.correlationId}`,
        time: now.toLocaleTimeString("en-GB", { hour12: false }),
        message: `Production connectivity readiness is ${health}%.`,
        tone: connectivity.overallStatus === "online" ? "success" : "warning",
      },
    ],
  };
}

function titleCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
