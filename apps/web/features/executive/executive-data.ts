export const serviceModeBanner =
  "Limited Mode: Live market, execution, and production data services are not yet fully connected. The interface is operating with service-status placeholders only.";

export const lifecycleProgress = [
  { stage: "START", status: "completed", progress: 100, time: "00:28", output: "System profile loaded", blocking: "None", route: "/platform-readiness/start" },
  { stage: "INITIALIZE", status: "completed", progress: 100, time: "01:14", output: "Agents initialized", blocking: "None", route: "/platform-readiness/initialize" },
  { stage: "CONNECT", status: "completed", progress: 100, time: "00:42", output: "MT5 bridge online", blocking: "None", route: "/platform-readiness/connect" },
  { stage: "VALIDATE", status: "completed", progress: 100, time: "00:36", output: "Account and symbol valid", blocking: "None", route: "/platform-readiness/validate" },
  { stage: "SYNCHRONIZE", status: "completed", progress: 100, time: "02:05", output: "Candles synchronized", blocking: "None", route: "/platform-readiness/synchronize" },
  { stage: "ANALYSE", status: "current", progress: 68, time: "08:17", output: "H8 sweep under review", blocking: "USD release in 22m", route: "/market-intelligence" },
  { stage: "PLAN", status: "waiting", progress: 0, time: "--", output: "Awaiting analysis lock", blocking: "Needs lower-timeframe BOS", route: "/strategy-opportunity/plan" },
  { stage: "SCAN", status: "running", progress: 42, time: "04:11", output: "Monitoring H1 demand", blocking: "None", route: "/strategy-opportunity/scan" },
  { stage: "QUALIFY", status: "waiting", progress: 0, time: "--", output: "No qualified entry", blocking: "Entry readiness incomplete", route: "/strategy-opportunity/qualify" },
  { stage: "AUTHORIZE", status: "waiting", progress: 0, time: "--", output: "Risk review pending", blocking: "No trade ticket", route: "/risk-execution/authorize" },
  { stage: "EXECUTE", status: "waiting", progress: 0, time: "--", output: "No execution request", blocking: "No authorization", route: "/risk-execution/execute" },
  { stage: "MANAGE", status: "waiting", progress: 0, time: "--", output: "No active basket", blocking: "No position", route: "/trade-operations/manage" },
  { stage: "CLOSE", status: "waiting", progress: 0, time: "--", output: "No closure queue", blocking: "No position", route: "/trade-operations/close" },
  { stage: "REVIEW", status: "waiting", progress: 0, time: "--", output: "No completed trade", blocking: "No trade closed", route: "/performance-control/review" },
  { stage: "LEARN", status: "waiting", progress: 0, time: "--", output: "Learning idle", blocking: "No review output", route: "/performance-control/learn" },
  { stage: "REPEAT", status: "waiting", progress: 0, time: "--", output: "Loop pending", blocking: "Current cycle open", route: "/performance-control/repeat" },
  { stage: "STOP", status: "waiting", progress: 0, time: "--", output: "No shutdown requested", blocking: "None", route: "/performance-control/stop" },
];

export const kpis = [
  { label: "System State", value: "Running", detail: "Autonomous loop active, no stop request pending.", tone: "success", trend: "Healthy" },
  { label: "Lifecycle Stage", value: "Analyse", detail: "68% complete. H8 liquidity sweep is being evaluated.", tone: "gold", trend: "8m 17s" },
  { label: "XAUUSD", value: "2364.28 / 2364.45", detail: "Bid / Ask with 1.7 pip spread. Daily change +0.42%.", tone: "info", trend: "+0.42%" },
  { label: "Market Regime", value: "Bullish Pullback", detail: "Higher timeframe bid remains intact; intraday is corrective.", tone: "success", trend: "Aligned" },
  { label: "Current AI Decision", value: "WAIT", detail: "Entry confirmation is not complete before USD news window.", tone: "ai", trend: "84%" },
  { label: "Daily P/L", value: "+$0.00", detail: "No closed P/L today. Daily risk budget remains available.", tone: "success", trend: "0.00%" },
  { label: "Open Risk", value: "0.00%", detail: "No active basket. Remaining daily risk 2.00%.", tone: "trade", trend: "Eligible" },
  { label: "Upcoming USD News", value: "Core PCE", detail: "High impact event in 22 minutes. Pre-news restriction active.", tone: "warning", trend: "22m" },
];

export const intelligenceRows = [
  ["Monthly direction", "Bullish", "success"],
  ["Weekly direction", "Bullish", "success"],
  ["Daily direction", "Pullback", "warning"],
  ["H12 context", "Demand defended", "success"],
  ["H8 direction", "Sell-side swept", "gold"],
  ["H8 liquidity condition", "Sweep confirmed", "gold"],
  ["Institutional bias", "Accumulation risk", "ai"],
  ["Retail bias", "Short breakout trap", "warning"],
  ["Gold strength", "Firm", "success"],
  ["USD strength", "Softening", "info"],
  ["Strength differential", "Gold +18", "success"],
  ["Active session", "London", "info"],
  ["News risk", "High in 22m", "warning"],
  ["Market regime", "Bullish pullback", "success"],
] as const;

export const opportunity = {
  title: "H8 Sell-Side Liquidity Sweep into H1 Demand",
  type: "Liquidity reversal",
  strategy: "H8 Liquidity Reversal",
  direction: "Buy scenario",
  score: "72%",
  risk: "Eligible after news window",
  authorization: "Not requested",
  execution: "Blocked",
  basket: "No active basket",
  entry: "2362.80 confirmation zone",
  stop: "2358.20 invalidation",
  targets: "2372.40 / 2381.00",
  expiry: "London close",
  reentry: "Allowed after M5 BOS",
};

export const workflowSteps = [
  "Detected",
  "Forming",
  "Waiting for Sweep",
  "Waiting for Pullback",
  "Qualified",
  "Authorized",
  "Executed",
  "Managing",
  "Closed",
  "Reviewed",
  "Learned",
];

export const riskRows = [
  ["Daily loss used", "0%", 0],
  ["Weekly loss used", "0%", 0],
  ["Current drawdown", "0.8%", 16],
  ["Open basket risk", "0%", 0],
  ["Prop-firm max daily loss", "5%", 40],
  ["Margin utilization", "7%", 7],
] as const;

export const basketRows = [
  {
    id: "No active basket",
    strategy: "Awaiting qualification",
    direction: "None",
    positions: "0",
    lots: "0.00",
    entry: "--",
    price: "2364.45",
    stop: "--",
    status: "Scanner monitoring",
    pl: "$0.00",
    action: "Monitor M5 BOS after news restriction",
  },
];

export const newsEvents = [
  { time: "22m", event: "Core PCE Price Index", impact: "High", forecast: "0.2%", previous: "0.2%", actual: "--", eligibility: "Restricted" },
  { time: "1h 45m", event: "Fed Speaker", impact: "Medium", forecast: "--", previous: "--", actual: "--", eligibility: "Stabilization required" },
  { time: "Tomorrow", event: "ISM Manufacturing PMI", impact: "High", forecast: "49.1", previous: "48.7", actual: "--", eligibility: "Pending" },
];

export const alerts = [
  {
    severity: "warning",
    title: "Pre-news trading restriction",
    description: "High-impact USD event inside the restricted window. New entries are blocked until stabilization completes.",
    source: "News risk engine",
    status: "Active",
    action: "Authorization gate locked",
  },
  {
    severity: "info",
    title: "Opportunity not qualified",
    description: "Scanner is monitoring H8 liquidity, session structure, USD news, and lower-timeframe confirmation.",
    source: "Opportunity scanner",
    status: "Watching",
    action: "No trade ticket created",
  },
];

export const activity = [
  ["09:02:11", "START", "System started", "Completed", "99%", "cycle-2026-07-19"],
  ["09:02:53", "CONNECT", "MT5 connected", "Completed", "98%", "mt5-bridge"],
  ["09:04:58", "SYNCHRONIZE", "Data synchronized", "Completed", "96%", "xauusd-mtf"],
  ["09:09:31", "ANALYSE", "Top-down analysis completed", "Completed", "91%", "analysis-118"],
  ["09:12:44", "ANALYSE", "H8 sweep detected", "Watching", "84%", "opp-standby"],
  ["09:13:22", "SCAN", "Opportunity state updated", "Waiting", "72%", "opp-standby"],
];

export const health = [
  ["API", "Healthy"],
  ["Database", "Recovering"],
  ["MT5 bridge", "Healthy"],
  ["Market data", "Healthy"],
  ["News feed", "Degraded"],
  ["WebSocket", "Healthy"],
  ["Workflow engine", "Healthy"],
  ["Analysis engine", "Healthy"],
  ["Risk engine", "Healthy"],
  ["Execution engine", "Offline"],
  ["Position manager", "Healthy"],
  ["Journal", "Recovering"],
  ["Learning engine", "Healthy"],
] as const;
