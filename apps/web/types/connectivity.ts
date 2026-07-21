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
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  marginLevel: number | null;
  currency: string | null;
  leverage: number | null;
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
  websocketEndpoint: string | null;
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

export type Mt5TerminalDebug = {
  ok: boolean;
  source: "mt5-local-python";
  terminalDetected: boolean;
  terminalConnected: boolean;
  accountConnected: boolean;
  symbol: string;
  symbolSelected: boolean;
  terminalPath: string | null;
  terminalName: string | null;
  detectedTerminalPaths: string[];
  brokerName: string | null;
  server: string | null;
  accountLogin: string | null;
  tradeMode: "live" | "demo" | "read-only" | "unconfigured";
  pingMs: number | null;
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  marginLevel: number | null;
  currency: string | null;
  leverage: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  lastTickAt: string | null;
  ticksPerMinute: number | null;
  positionsTotal: number | null;
  ordersTotal: number | null;
  permissions: string[];
  error: string | null;
};

export type ConnectivityDebugResponse = {
  mt5: Mt5TerminalDebug | null;
  sessions: Mt5SessionProfileSummary[];
  activeSessionId: string | null;
  storageMode: "mssql" | "memory";
  terminals: Mt5TerminalCatalogItem[];
};

export type Mt5SessionProfileSummary = {
  id: string;
  tenantId: string;
  userId: string;
  terminalId: string;
  label: string;
  terminalPath: string | null;
  login: string | null;
  server: string | null;
  accountType: "Demo" | "Live" | "Prop Firm";
  hasPassword: boolean;
  active: boolean;
  lastUpdatedAt: string;
};

export type Mt5SessionProfileCreate = {
  tenantId: string;
  userId: string;
  terminalId: string;
  label: string;
  terminalPath: string | null;
  login: string | null;
  password: string;
  server: string | null;
  accountType: "Demo" | "Live" | "Prop Firm";
  activate: boolean;
};

export type Mt5TerminalCatalogItem = {
  terminalId: string;
  terminalName: string;
  terminalPath: string;
  brokerName: string | null;
  detectedServer: string | null;
  serverOptions: string[];
};

export type Mt5SessionProfilesResponse = {
  profiles: Mt5SessionProfileSummary[];
  activeSessionId: string | null;
  storageMode: "mssql" | "memory";
};

export type Mt5SessionMutationResponse = {
  profiles: Mt5SessionProfileSummary[];
  activeSessionId: string | null;
  storageMode: "mssql" | "memory";
};
