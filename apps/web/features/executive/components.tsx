import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Brain,
  CandlestickChart,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  CircleStop,
  Clock,
  Database,
  Gauge,
  Landmark,
  Newspaper,
  Pause,
  RefreshCw,
  ShieldCheck,
  Siren,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  activity,
  alerts,
  basketRows,
  health,
  intelligenceRows,
  kpis,
  lifecycleProgress,
  newsEvents,
  opportunity,
  riskRows,
  serviceModeBanner,
  workflowSteps,
} from "./executive-data";

type AsyncState = "ready" | "loading" | "empty" | "error" | "realtime";

const toneClass: Record<string, string> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  ai: "ai",
  trade: "success",
  gold: "gold",
};

export function ExecutiveCommandCentre({ state = "ready" }: { state?: AsyncState }) {
  return (
    <main className="content executive-page" aria-busy={state === "loading"}>
      <section className="executive-header">
        <div className="page-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>Executive Command Centre</span>
            <span>Dashboard</span>
          </nav>
          <div>
            <h1>Executive Command Centre</h1>
            <p className="executive-subtitle">Real-time control, intelligence, risk, and autonomous trading lifecycle for XAUUSD</p>
          </div>
          <div className="metadata">
            <span className="pill success">System state: Running</span>
            <span className="pill gold">Environment: Demo</span>
            <span className="pill">Updated 4 sec ago</span>
            <span className="pill">Audit stream active</span>
          </div>
        </div>
        <div className="metadata" style={{ justifyContent: "flex-end" }}>
          <span className="pill info">MT5 Connected</span>
          <span className="pill">London Session</span>
        </div>
      </section>

      <div className="limited-banner" role="status">
        <AlertTriangle size={18} />
        <span>{serviceModeBanner}</span>
      </div>

      <SystemControlBar />
      <LifecycleTracker />
      <ExecutiveKpiCards />
      <GoldMarketIntelligenceWorkspace />
      <AutonomousDecisionPanel />
      <OpportunityWorkflow />
      <div className="two-column">
        <AccountRiskPanel />
        <NewsSessionPanel />
      </div>
      <OpenBasketTable />
      <div className="two-column">
        <AlertCentre />
        <ActivityTimeline />
      </div>
      <SystemHealthGrid />
    </main>
  );
}

export function SystemControlBar() {
  return (
    <section className="section control-bar" aria-label="Autonomous system controls">
      <div>
        <h2>Autonomous Lifecycle Controls</h2>
        <p>Current state is Running. Stop policy is controlled shutdown unless emergency protection is confirmed.</p>
        <div className="metadata" style={{ marginTop: 10 }}>
          <span className="pill success">Loop active</span>
          <span className="pill warning">Pre-news restriction active</span>
        </div>
      </div>
      <div className="control-actions">
        <button className="control-button gold"><CirclePlay size={17} /> Start</button>
        <button className="control-button warning"><Pause size={17} /> Pause</button>
        <button className="control-button success" disabled><CirclePlay size={17} /> Resume</button>
        <button className="control-button"><CirclePause size={17} /> Controlled Stop</button>
        <button className="control-button danger"><CircleStop size={17} /> Close and Stop</button>
        <button className="control-button danger" aria-describedby="destructive-stop"><Siren size={17} /> Emergency Stop</button>
      </div>
      <p id="destructive-stop" className="kpi-detail">Destructive stop actions require confirmation before execution.</p>
    </section>
  );
}

export function LifecycleTracker() {
  return (
    <section className="section">
      <div className="chart-toolbar">
        <div>
          <h2>Lifecycle Progress Tracker</h2>
          <p>Current stage, progress, latest output, blocking condition, and direct lifecycle route access.</p>
        </div>
        <span className="pill gold">Current: ANALYSE</span>
      </div>
      <div className="lifecycle-tracker" role="list" aria-label="Autonomous lifecycle stages">
        <div className="lifecycle-rail">
          {lifecycleProgress.map((stage) => (
            <Link key={stage.stage} href={stage.route} className={`stage-card ${stage.status}`} role="listitem">
              <span className="stage-label">{stage.stage}</span>
              <div className="progress" aria-label={`${stage.stage} progress ${stage.progress}%`}><span style={{ width: `${stage.progress}%` }} /></div>
              <span className="stage-meta">Status: {stage.status}</span>
              <span className="stage-meta">Time: {stage.time}</span>
              <span className="stage-meta">Output: {stage.output}</span>
              <span className="stage-meta">Block: {stage.blocking}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ExecutiveKpiCards() {
  const icons = [Gauge, Zap, CandlestickChart, BarChart3, Brain, TrendingUp, ShieldCheck, Newspaper];
  return (
    <section className="kpi-grid" aria-label="Executive trading KPIs">
      {kpis.map((kpi, index) => {
        const Icon = icons[index] ?? Gauge;
        return (
          <article key={kpi.label} className="section kpi-card">
            <div className="kpi-top"><span>{kpi.label}</span><Icon size={18} /></div>
            <div className="kpi-value">{kpi.value}</div>
            <p className="kpi-detail">{kpi.detail}</p>
            <span className={`pill ${toneClass[kpi.tone] ?? ""}`}>{kpi.trend}</span>
          </article>
        );
      })}
    </section>
  );
}

export function GoldPriceCard() {
  return (
    <article className="section kpi-card">
      <div className="kpi-top"><span>XAUUSD</span><CandlestickChart size={18} /></div>
      <div className="kpi-value">2364.45</div>
      <p className="kpi-detail">Bid 2364.28, ask 2364.45, spread 1.7 pips, daily change +0.42%.</p>
      <span className="trend up">Gold bid holding above H1 demand</span>
    </article>
  );
}

export function MarketRegimeCard() {
  return (
    <article className="section kpi-card">
      <div className="kpi-top"><span>Market Regime</span><BarChart3 size={18} /></div>
      <div className="kpi-value">Bullish Pullback</div>
      <p className="kpi-detail">Monthly and weekly remain bullish while daily corrects into demand.</p>
      <span className="pill success">Tradeable after restriction</span>
    </article>
  );
}

export function GoldMarketIntelligenceWorkspace() {
  const candles = [52, 88, 74, 116, 132, 101, 154, 126, 170, 148, 190, 165, 208, 178, 222, 198, 236, 210, 248, 224, 262, 240];
  return (
    <section className="workspace-grid">
      <div className="section chart-panel">
        <div className="chart-toolbar">
          <div>
            <h2>XAUUSD Market Intelligence</h2>
            <p>Candles, liquidity, session levels, order blocks, fair value gaps, and current opportunity overlays.</p>
          </div>
          <div className="timeframes" aria-label="Timeframe selector">
            {["M5", "M15", "H1", "H4", "H8", "H12", "D1"].map((tf) => <button key={tf} className={tf === "H8" ? "active" : ""}>{tf}</button>)}
          </div>
        </div>
        <div className="chart-canvas" aria-label="XAUUSD candlestick chart with trading levels">
          {candles.map((height, index) => (
            <span key={index} className={`candle ${index % 3 === 0 ? "down" : "up"}`} style={{ left: `${5 + index * 4}%`, height }} />
          ))}
          <span className="level-line gold" style={{ top: "18%" }}>Previous-week high / H12 liquidity</span>
          <span className="level-line info" style={{ top: "38%" }}>Previous-day high</span>
          <span className="level-line" style={{ top: "62%" }}>London session low</span>
          <span className="level-line gold" style={{ top: "75%" }}>H1 demand and fair value gap</span>
          <span className="zone" style={{ top: "66%", bottom: "18%" }}>Order block + FVG retest zone</span>
          <span className="marker entry" style={{ left: "56%", top: "58%" }}>Entry watch</span>
          <span className="marker stop" style={{ left: "42%", top: "79%" }}>Stop</span>
          <span className="marker target" style={{ left: "77%", top: "24%" }}>Target 1</span>
        </div>
      </div>
      <div className="section">
        <h2>Intelligence Panel</h2>
        <div className="intelligence-list">
          {intelligenceRows.map(([label, value, tone]) => (
            <div className="status-row" key={label}>
              <span>{label}</span>
              <span className={`pill ${toneClass[tone] ?? ""}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AutonomousDecisionPanel() {
  return (
    <section className="section decision-card">
      <div className="decision-grid">
        <div className="decision-score">
          <h2>Current Autonomous Decision</h2>
          <div className="big-decision">WAIT</div>
          <span className="pill ai">Confidence 84%</span>
          <span className="pill gold">Strategy: H8 Liquidity Reversal</span>
          <span className="pill warning">Required confirmation: M5 BOS</span>
        </div>
        <div className="dashboard-grid">
          <p><strong>Narrative:</strong> Monthly and Weekly remain bullish. Daily is in pullback. H8 has swept sell-side liquidity, but M5 bullish structure shift has not formed.</p>
          <div className="evidence-grid">
            <div>
              <h3>Supporting Evidence</h3>
              <ul className="evidence-list">
                <li>H8 sell-side liquidity sweep completed.</li>
                <li>H1 demand overlaps fair value gap.</li>
                <li>Gold strength is firm while USD softens.</li>
              </ul>
            </div>
            <div>
              <h3>Conflicting Evidence</h3>
              <ul className="evidence-list">
                <li>High-impact USD release in 22 minutes.</li>
                <li>M5 bullish break of structure is missing.</li>
                <li>London range is still expanding.</li>
              </ul>
            </div>
          </div>
          <div className="metadata">
            <span className="pill info">Entry readiness: 62%</span>
            <span className="pill warning">Invalidation: H1 demand break</span>
            <span className="pill">Next action: Monitor M5 BOS</span>
            <span className="pill">Decision timestamp: 09:14:08</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OpportunityWorkflow() {
  return (
    <section className="section">
      <div className="chart-toolbar">
        <div>
          <h2>Opportunity and Trade Workflow</h2>
          <p>{opportunity.title}</p>
        </div>
        <span className="pill warning">Lifecycle status: Waiting for Pullback</span>
      </div>
      <div className="workflow-steps" aria-label="Opportunity workflow">
        {workflowSteps.map((step, index) => <span key={step} className={`workflow-step ${index < 3 ? "done" : index === 3 ? "current" : ""}`}>{step}</span>)}
      </div>
      <div className="three-column" style={{ marginTop: 14 }}>
        {Object.entries(opportunity).filter(([key]) => key !== "title").map(([key, value]) => (
          <div className="status-row" key={key}><span>{labelize(key)}</span><span className="status-value">{value}</span></div>
        ))}
      </div>
    </section>
  );
}

export function AccountRiskPanel() {
  return (
    <section className="section">
      <h2>Account and Risk</h2>
      <div className="three-column">
        {["Balance $100,000", "Equity $100,000", "Free margin $93,000", "Used margin $7,000", "Margin level 1428%", "Risk eligibility Active"].map((item) => (
          <span className="pill" key={item}>{item}</span>
        ))}
      </div>
      <div className="risk-list" style={{ marginTop: 16 }}>
        {riskRows.map(([label, value, progress]) => (
          <div className="risk-row" key={label}>
            <header><span>{label}</span><strong>{value}</strong></header>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OpenBasketTable() {
  return (
    <section className="section">
      <h2>Open Positions and Basket</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Basket ID</th><th>Strategy</th><th>Direction</th><th>Positions</th><th>Lots</th><th>Entry</th><th>Current</th><th>Stop</th><th>Status</th><th>P/L</th><th>Next action</th>
          </tr>
        </thead>
        <tbody>
          {basketRows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td><td>{row.strategy}</td><td>{row.direction}</td><td>{row.positions}</td><td>{row.lots}</td><td>{row.entry}</td><td>{row.price}</td><td>{row.stop}</td><td>{row.status}</td><td>{row.pl}</td><td>{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 12 }}>Break-even, profit lock, trailing status, MFE, and MAE will expand from each active basket row once positions are open.</p>
    </section>
  );
}

export function NewsSessionPanel() {
  return (
    <section className="section">
      <h2>News and Session</h2>
      <div className="metadata">
        <span className="pill info">London Session</span>
        <span className="pill">08:00-17:00</span>
        <span className="pill">High 2368.20</span>
        <span className="pill">Low 2359.10</span>
        <span className="pill warning">Trading eligibility restricted</span>
      </div>
      <ol className="timeline" style={{ marginTop: 16 }}>
        {newsEvents.map((event) => (
          <li key={event.event}>
            <strong>{event.time}</strong>
            <span>{event.event} - {event.impact} impact. Forecast {event.forecast}, previous {event.previous}, actual {event.actual}. {event.eligibility}.</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AlertCentre() {
  return (
    <section className="section">
      <h2>Alerts and Exceptions</h2>
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className={`alert-item ${alert.severity}`} key={alert.title}>
            <Bell size={18} />
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.description}</p>
              <div className="metadata" style={{ marginTop: 8 }}>
                <span className="pill">{alert.source}</span>
                <span className="pill">{alert.status}</span>
                <span className="pill">{alert.action}</span>
              </div>
            </div>
            <button className="search-button">Open</button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ActivityTimeline() {
  return (
    <section className="section">
      <h2>Autonomous Activity Timeline</h2>
      <ol className="timeline">
        {activity.map(([time, stage, action, result, confidence, related]) => (
          <li key={`${time}-${action}`}>
            <strong>{time}</strong>
            <span>{stage}: {action}. Result {result}. Confidence {confidence}. Related: {related}.</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SystemHealthGrid() {
  return (
    <section className="section">
      <div className="chart-toolbar">
        <div>
          <h2>System Health</h2>
          <p>Backend and service status details are isolated here with recovery controls.</p>
        </div>
        <div className="metadata">
          <button className="search-button"><RefreshCw size={16} /> Retry degraded</button>
          <button className="search-button"><Database size={16} /> Sync services</button>
        </div>
      </div>
      <div className="health-grid">
        {health.map(([name, status]) => (
          <div className="health-card" key={name}>
            <strong>{name}</strong>
            <span className={`pill ${status === "Healthy" ? "success" : status === "Offline" ? "warning" : "info"}`}>{status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
