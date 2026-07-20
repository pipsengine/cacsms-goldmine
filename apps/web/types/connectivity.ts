export type ConnectivityStatus = "online" | "connecting" | "degraded" | "offline";

export type ConnectivitySeverity = "info" | "warning" | "critical";

export type ConnectivityServiceKind =
  | "broker"
  | "market-data"
  | "ai-engine"
  | "database"
  | "external"
  | "realtime"
  | "diagnostics";

export type ConnectivityService = {
  id: string;
  name: string;
  kind: ConnectivityServiceKind;
  status: ConnectivityStatus;
  latencyMs: number | null;
  uptimePercent: number;
  lastHeartbeatAt: string;
  endpoint: string;
  evidence: string;
};

export type BrokerConnectivity = {
  status: ConnectivityStatus;
  brokerName: string;
  terminal: string;
  account: string;
  server: string;
  tradeMode: "live" | "demo" | "read-only" | "unconfigured";
  pingMs: number | null;
  spreadPoints: number | null;
  permissions: string[];
};

export type MarketDataConnectivity = {
  status: ConnectivityStatus;
  symbol: string;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  ticksPerMinute: number;
  lastTickAt: string;
  provider: string;
};

export type AiEngineConnectivity = {
  status: ConnectivityStatus;
  activeAgents: number;
  registeredAgents: number;
  queueDepth: number;
  inferenceLatencyMs: number | null;
  modelGateway: string;
};

export type ConnectivityAlert = {
  id: string;
  severity: ConnectivitySeverity;
  title: string;
  detail: string;
  createdAt: string;
};

export type ConnectivityLog = {
  id: string;
  level: ConnectivitySeverity;
  message: string;
  timestamp: string;
  source: string;
};

export type ConnectivitySnapshot = {
  schemaVersion: "connectivity/v1";
  generatedAt: string;
  correlationId: string;
  overallStatus: ConnectivityStatus;
  readinessScore: number;
  autoRefreshMs: number;
  reconnectAttempt: number;
  sseEndpoint: string;
  websocketEndpoint: string;
  broker: BrokerConnectivity;
  marketData: MarketDataConnectivity;
  aiEngine: AiEngineConnectivity;
  services: ConnectivityService[];
  alerts: ConnectivityAlert[];
  logs: ConnectivityLog[];
  diagnostics: {
    dns: ConnectivityStatus;
    tls: ConnectivityStatus;
    auth: ConnectivityStatus;
    clock: ConnectivityStatus;
    dataQuality: ConnectivityStatus;
    failover: ConnectivityStatus;
  };
};

export type ConnectivitySnapshotResponse = {
  snapshot: ConnectivitySnapshot;
};
