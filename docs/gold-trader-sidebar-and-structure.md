# Gold Trader Complete Sidebar and Modern Folder Structure

## 1. Navigation Architecture Principles

The application navigation will be structured around the eight approved functional areas:

1. Executive Command Centre
2. Platform Readiness
3. Gold Market Intelligence
4. Trading Strategy and Opportunity
5. Risk, Authorization and Execution
6. Position and Trade Operations
7. Performance, Learning and Control
8. Platform Administration

The following navigation rules are mandatory:

* Every functional area has one parent dashboard.
* Every lifecycle stage has one dedicated stage dashboard.
* Every major operational function has its own route.
* Parent dashboards summarize information and do not replace child workspaces.
* Child pages must not be represented as dashboard cards used for primary navigation.
* The sidebar remains the primary navigation mechanism.
* Breadcrumbs show the current functional area, lifecycle stage, and page.
* Global search and the command palette may provide secondary navigation.
* Each page must have a dedicated permission code, route, status, and audit identity.
* Administration and authentication remain disabled during initial trading-system development.
* The lifecycle stage currently being executed must be highlighted automatically.
* Pages must read from and write to the production database or relevant real-time service.
* Mock data must not remain in operational pages after backend integration.
* All pages must support responsive desktop layouts, loading states, empty states, errors, retries, and audit history.

---

# 2. Complete Sidebar Structure

```text
Gold Trader
│
├── 1. Executive Command Centre
│   ├── Executive Dashboard
│   ├── Lifecycle Command Centre
│   ├── Autonomous Workflow Monitor
│   ├── Trading Operations Dashboard
│   ├── Risk and Exposure Dashboard
│   ├── Performance Dashboard
│   ├── System Health Dashboard
│   ├── Alerts and Exceptions
│   └── Autonomous Activity Timeline
│
├── 2. Platform Readiness
│   ├── Readiness Dashboard
│   │
│   ├── Start
│   │   ├── Start Command Centre
│   │   ├── Operating Mode
│   │   ├── Trading Profile
│   │   ├── Risk Profile
│   │   ├── Pre-Start Checklist
│   │   └── Startup History
│   │
│   ├── Initialize
│   │   ├── Initialization Centre
│   │   ├── Engine Initialization
│   │   ├── AI Agent Initialization
│   │   ├── Service Initialization
│   │   ├── Dependency Monitor
│   │   ├── Configuration Loading
│   │   └── Initialization Logs
│   │
│   ├── Connect
│   │   ├── Connectivity Centre
│   │   ├── MT5 Bridge
│   │   ├── Broker Connection
│   │   ├── Market Data Connection
│   │   ├── News and Calendar Connection
│   │   ├── Database Connection
│   │   ├── Real-Time Messaging
│   │   └── Connection History
│   │
│   ├── Validate
│   │   ├── Validation Centre
│   │   ├── Account Validation
│   │   ├── Gold Symbol Validation
│   │   ├── Broker Validation
│   │   ├── Risk Readiness
│   │   ├── Strategy Readiness
│   │   ├── Existing Trade Reconciliation
│   │   ├── Validation Exceptions
│   │   └── Validation History
│   │
│   └── Synchronize
│       ├── Synchronization Centre
│       ├── Multi-Timeframe Synchronization
│       ├── Tick and Candle Synchronization
│       ├── Account State Synchronization
│       ├── Positions and Orders
│       ├── News Synchronization
│       ├── Session Synchronization
│       ├── Time Synchronization
│       ├── Data Quality Monitor
│       └── Synchronization History
│
├── 3. Gold Market Intelligence
│   ├── Market Intelligence Dashboard
│   │
│   ├── Top-Down Analysis
│   │   ├── Multi-Timeframe Dashboard
│   │   ├── Monthly Analysis
│   │   ├── Weekly Analysis
│   │   ├── Daily Analysis
│   │   ├── H12 Analysis
│   │   ├── H8 Direction and Liquidity
│   │   ├── Intermediate Timeframes
│   │   ├── Tactical Timeframes
│   │   ├── Execution Timeframes
│   │   ├── Timeframe Alignment Matrix
│   │   ├── Structure Matrix
│   │   ├── Liquidity Matrix
│   │   ├── Momentum Matrix
│   │   ├── Volatility Matrix
│   │   └── Timeframe Conflict Monitor
│   │
│   ├── Institutional Intelligence
│   │   ├── Institutional Dashboard
│   │   ├── Market Structure
│   │   ├── Liquidity Intelligence
│   │   ├── Liquidity Sweeps
│   │   ├── Order Blocks
│   │   ├── Breaker Blocks
│   │   ├── Mitigation Blocks
│   │   ├── Fair Value Gaps
│   │   ├── Balanced Price Ranges
│   │   ├── Displacement
│   │   ├── Premium and Discount
│   │   ├── Inducement
│   │   ├── Accumulation and Distribution
│   │   ├── Institutional Price Delivery
│   │   ├── Institutional Targets
│   │   └── Institutional Narrative
│   │
│   ├── Retail Technical Intelligence
│   │   ├── Retail Intelligence Dashboard
│   │   ├── Trend Analysis
│   │   ├── Support and Resistance
│   │   ├── Trendlines and Channels
│   │   ├── Chart Patterns
│   │   ├── Candlestick Intelligence
│   │   ├── Moving Averages
│   │   ├── Momentum Indicators
│   │   ├── Volatility Indicators
│   │   ├── Volume Intelligence
│   │   ├── VWAP and Anchored VWAP
│   │   ├── Fibonacci Analysis
│   │   ├── Breakout and Retest
│   │   ├── Divergence Analysis
│   │   └── Retail Technical Summary
│   │
│   ├── Gold–USD Strength
│   │   ├── Strength Dashboard
│   │   ├── Live Strength Matrix
│   │   ├── Multi-Timeframe Strength
│   │   ├── Gold Strength
│   │   ├── USD Strength
│   │   ├── Strength Differential
│   │   ├── Strength Acceleration
│   │   ├── Strength Persistence
│   │   ├── Strength Divergence
│   │   ├── Strength Exhaustion
│   │   └── Strength History
│   │
│   ├── USD News Intelligence
│   │   ├── News Intelligence Dashboard
│   │   ├── USD Economic Calendar
│   │   ├── Live Events
│   │   ├── Event Countdown
│   │   ├── Forecast vs Actual
│   │   ├── News Impact Analysis
│   │   ├── Historical Gold Reactions
│   │   ├── Pre-News Restrictions
│   │   ├── Post-News Stabilization
│   │   ├── Fed Intelligence
│   │   └── News Analysis History
│   │
│   ├── Session Intelligence
│   │   ├── Session Dashboard
│   │   ├── Asian Session
│   │   ├── London Session
│   │   ├── New York Session
│   │   ├── London–New York Overlap
│   │   ├── Session Highs and Lows
│   │   ├── Session Liquidity
│   │   ├── Session Sweep Analysis
│   │   ├── Session Volatility
│   │   ├── Session Transition
│   │   └── Session History
│   │
│   ├── Market Regime
│   │   ├── Market Regime Dashboard
│   │   ├── Current Regime
│   │   ├── Regime Transitions
│   │   ├── Trend Regime
│   │   ├── Range Regime
│   │   ├── Breakout Regime
│   │   ├── Pullback Regime
│   │   ├── Reversal Regime
│   │   ├── News-Driven Regime
│   │   ├── Untradeable Conditions
│   │   ├── Strategy Compatibility
│   │   └── Regime History
│   │
│   └── Hybrid Market Interpretation
│       ├── Hybrid Confluence Dashboard
│       ├── Institutional–Retail Confluence
│       ├── Supporting Evidence
│       ├── Conflicting Evidence
│       ├── Market Narrative
│       ├── Directional Confidence
│       ├── Buy Scenario
│       ├── Sell Scenario
│       ├── Wait Scenario
│       └── Analysis History
│
├── 4. Trading Strategy and Opportunity
│   ├── Strategy and Opportunity Dashboard
│   │
│   ├── Plan
│   │   ├── Autonomous Trading Plan
│   │   ├── Daily Trading Plan
│   │   ├── Session Plans
│   │   ├── Strategy Activation
│   │   ├── Strategy Restrictions
│   │   ├── Risk Allocation Plan
│   │   ├── News Trading Plan
│   │   ├── Trading Windows
│   │   ├── No-Trade Conditions
│   │   ├── Daily Objectives
│   │   └── Plan History
│   │
│   ├── Strategy Library
│   │   ├── Strategy Library Dashboard
│   │   ├── H8 Liquidity Continuation
│   │   ├── H8 Liquidity Reversal
│   │   ├── H12 Liquidity Reversal
│   │   ├── Trend Pullback
│   │   ├── Breakout and Retest
│   │   ├── Order Block Mitigation
│   │   ├── Fair Value Gap Retracement
│   │   ├── Asian Range Sweep
│   │   ├── London Continuation
│   │   ├── London Reversal
│   │   ├── New York Continuation
│   │   ├── New York Reversal
│   │   ├── Post-News Continuation
│   │   ├── Post-News Reversal
│   │   ├── Range Mean Reversion
│   │   ├── Momentum Breakout
│   │   └── Re-Entry Strategy
│   │
│   ├── Scan
│   │   ├── Opportunity Scanner Dashboard
│   │   ├── Live Market Scanner
│   │   ├── Institutional Scanner
│   │   ├── Retail Scanner
│   │   ├── H8 Liquidity Scanner
│   │   ├── H12 Liquidity Scanner
│   │   ├── Session Scanner
│   │   ├── News Scanner
│   │   ├── Breakout Scanner
│   │   ├── Pullback Scanner
│   │   ├── Reversal Scanner
│   │   ├── Re-Entry Scanner
│   │   ├── Detected Opportunities
│   │   ├── Scanner Performance
│   │   └── Scan History
│   │
│   └── Qualify
│       ├── Opportunity Qualification Dashboard
│       ├── Qualification Queue
│       ├── Opportunity Details
│       ├── Top-Down Validation
│       ├── Institutional Validation
│       ├── Retail Validation
│       ├── Strength Validation
│       ├── News Validation
│       ├── Session Validation
│       ├── Market Regime Validation
│       ├── Strategy Matching
│       ├── Confluence Scoring
│       ├── Entry Readiness
│       ├── Target Analysis
│       ├── Risk-to-Reward Validation
│       ├── Qualified Opportunities
│       ├── Rejected Opportunities
│       ├── Invalidated Opportunities
│       ├── Expired Opportunities
│       └── Qualification History
│
├── 5. Risk, Authorization and Execution
│   ├── Risk and Execution Dashboard
│   │
│   ├── Risk Control
│   │   ├── Risk Control Dashboard
│   │   ├── Account Risk
│   │   ├── Daily Risk
│   │   ├── Weekly Risk
│   │   ├── Drawdown Control
│   │   ├── Equity Protection
│   │   ├── Margin Control
│   │   ├── Exposure Control
│   │   ├── Consecutive Loss Control
│   │   ├── Session Risk
│   │   ├── News Risk
│   │   ├── Prop-Firm Risk
│   │   ├── Spread Protection
│   │   ├── Slippage Protection
│   │   └── Risk Events
│   │
│   ├── Authorize
│   │   ├── Trade Authorization Dashboard
│   │   ├── Authorization Queue
│   │   ├── Independent Risk Review
│   │   ├── Account Eligibility
│   │   ├── Position Size Calculator
│   │   ├── Basket Risk Authorization
│   │   ├── News Authorization
│   │   ├── Session Authorization
│   │   ├── Prop-Firm Authorization
│   │   ├── Final Trade Decision
│   │   ├── Approved Trades
│   │   ├── Reduced-Risk Approvals
│   │   ├── Delayed Authorizations
│   │   ├── Rejected Authorizations
│   │   └── Authorization History
│   │
│   └── Execute
│       ├── MT5 Execution Dashboard
│       ├── Execution Queue
│       ├── Market Orders
│       ├── Pending Orders
│       ├── Buy Orders
│       ├── Sell Orders
│       ├── Order Routing
│       ├── Multi-Position Execution
│       ├── Broker Responses
│       ├── Execution Confirmation
│       ├── Slippage Monitor
│       ├── Requote Monitor
│       ├── Partial Fills
│       ├── Duplicate Prevention
│       ├── Execution Reconciliation
│       ├── Execution Incidents
│       └── Execution History
│
├── 6. Position and Trade Operations
│   ├── Trading Operations Dashboard
│   │
│   ├── Manage
│   │   ├── Position Management Dashboard
│   │   ├── Active Positions
│   │   ├── Active Baskets
│   │   ├── Position Details
│   │   ├── Basket Details
│   │   ├── Weighted Average Entry
│   │   ├── Stop-Loss Manager
│   │   ├── Break-Even Manager
│   │   ├── Profit-Lock Manager
│   │   ├── Trailing-Stop Manager
│   │   ├── Partial Profit Manager
│   │   ├── Scale-In Manager
│   │   ├── Scale-Out Manager
│   │   ├── Re-Entry Manager
│   │   ├── Pending Order Manager
│   │   ├── News Protection
│   │   ├── Session Transition
│   │   ├── Structure Monitor
│   │   ├── Liquidity Monitor
│   │   ├── Momentum Monitor
│   │   ├── Basket Risk Monitor
│   │   ├── Emergency Protection
│   │   └── Management Action History
│   │
│   └── Close
│       ├── Trade Closure Dashboard
│       ├── Closure Queue
│       ├── Full Position Closure
│       ├── Basket Closure
│       ├── Partial Closure
│       ├── Take-Profit Closures
│       ├── Stop-Loss Closures
│       ├── Trailing-Stop Closures
│       ├── Strategy Exit
│       ├── Structure Exit
│       ├── Liquidity Exit
│       ├── Session Exit
│       ├── News Exit
│       ├── Risk Exit
│       ├── Emergency Closure
│       ├── Closure Reconciliation
│       ├── Completed Trades
│       └── Closure History
│
├── 7. Performance, Learning and Control
│   ├── Performance and Control Dashboard
│   │
│   ├── Review
│   │   ├── Post-Trade Review Dashboard
│   │   ├── Trade Journal
│   │   ├── Trade Details
│   │   ├── Decision Replay
│   │   ├── Market Analysis Review
│   │   ├── H8/H12 Review
│   │   ├── Institutional Review
│   │   ├── Retail Review
│   │   ├── Entry Review
│   │   ├── Execution Review
│   │   ├── Management Review
│   │   ├── Exit Review
│   │   ├── Strategy Performance
│   │   ├── Session Performance
│   │   ├── News Performance
│   │   ├── Buy vs Sell Performance
│   │   ├── Market Regime Performance
│   │   ├── Risk Compliance
│   │   ├── Missed Opportunities
│   │   ├── Failed Opportunities
│   │   └── Review History
│   │
│   ├── Learn
│   │   ├── Learning Dashboard
│   │   ├── Pattern Discovery
│   │   ├── Winning Patterns
│   │   ├── Losing Patterns
│   │   ├── Strategy Optimization
│   │   ├── Threshold Optimization
│   │   ├── Model Performance
│   │   ├── Model Drift
│   │   ├── Performance Degradation
│   │   ├── Backtesting Studio
│   │   ├── Walk-Forward Testing
│   │   ├── Out-of-Sample Testing
│   │   ├── Monte Carlo Testing
│   │   ├── Champion–Challenger Models
│   │   ├── Optimization Recommendations
│   │   ├── Model Governance
│   │   ├── Strategy Versions
│   │   ├── Model Versions
│   │   └── Learning History
│   │
│   ├── Repeat
│   │   ├── Autonomous Loop Dashboard
│   │   ├── Current Cycle
│   │   ├── Cycle Monitor
│   │   ├── Reanalysis Trigger
│   │   ├── Cooldown Controller
│   │   ├── Session Reset
│   │   ├── Daily Reset
│   │   ├── Loop Limits
│   │   ├── Trade Frequency Control
│   │   ├── Next Opportunity Readiness
│   │   └── Loop History
│   │
│   └── Stop
│       ├── Controlled Shutdown Dashboard
│       ├── Stop New Trades
│       ├── Stop After Active Trades
│       ├── Stop After Session
│       ├── Cancel Orders and Stop
│       ├── Close and Stop
│       ├── Emergency Stop
│       ├── Shutdown Checklist
│       ├── Shutdown Reconciliation
│       ├── Restart Authorization
│       └── Shutdown History
│
└── 8. Platform Administration
    ├── Administration Dashboard
    │
    ├── Tenant Administration
    │   ├── Tenant Dashboard
    │   ├── Tenant Directory
    │   ├── Create Tenant
    │   ├── Tenant Profiles
    │   ├── Tenant Environments
    │   ├── Tenant Broker Accounts
    │   ├── Tenant MT5 Accounts
    │   ├── Tenant Risk Profiles
    │   ├── Tenant Strategy Access
    │   ├── Tenant Subscription
    │   ├── Tenant Data Isolation
    │   ├── Tenant Status
    │   └── Tenant Audit
    │
    ├── User Administration
    │   ├── User Dashboard
    │   ├── User Directory
    │   ├── Create User
    │   ├── User Profiles
    │   ├── Tenant Assignment
    │   ├── Role Assignment
    │   ├── User Status
    │   ├── User Sessions
    │   ├── User Activity
    │   ├── Deactivated Users
    │   └── User Audit
    │
    ├── Roles and Access Control
    │   ├── Access Control Dashboard
    │   ├── Roles
    │   ├── Permissions
    │   ├── Role-Permission Matrix
    │   ├── Module Access
    │   ├── Page Access
    │   ├── Action Access
    │   ├── Tenant Scope
    │   ├── Approval Rights
    │   ├── Data Access Rules
    │   └── Access History
    │
    ├── Authentication and Security
    │   ├── Authentication Dashboard
    │   ├── Login Settings
    │   ├── Password Policy
    │   ├── Multi-Factor Authentication
    │   ├── First Login
    │   ├── Password Reset
    │   ├── Session Policy
    │   ├── Account Lockout
    │   ├── Trusted Devices
    │   ├── Login History
    │   └── Security Events
    │
    ├── Broker and MT5 Administration
    │   ├── Trading Environment Dashboard
    │   ├── Brokers
    │   ├── MT5 Terminals
    │   ├── Trading Accounts
    │   ├── Gold Symbol Mapping
    │   ├── Bridge Settings
    │   ├── Execution Rules
    │   ├── Prop-Firm Profiles
    │   ├── Connectivity
    │   └── Environment History
    │
    ├── Strategy and Risk Administration
    │   ├── Trading Configuration Dashboard
    │   ├── Strategy Library
    │   ├── Strategy Versions
    │   ├── Risk Profiles
    │   ├── Trading Profiles
    │   ├── Session Rules
    │   ├── News Rules
    │   ├── Basket Rules
    │   ├── Position Sizing Rules
    │   ├── Profit Protection Rules
    │   ├── Re-Entry Rules
    │   ├── Stop Rules
    │   └── Configuration History
    │
    ├── Integrations
    │   ├── Integration Dashboard
    │   ├── Market Data Providers
    │   ├── News Providers
    │   ├── Economic Calendar Providers
    │   ├── Notification Providers
    │   ├── API Credentials
    │   ├── Webhooks
    │   ├── Integration Health
    │   └── Integration Logs
    │
    ├── System Settings
    │   ├── Settings Dashboard
    │   ├── General Settings
    │   ├── Environment Settings
    │   ├── Timezones
    │   ├── Trading Day
    │   ├── Sessions
    │   ├── Data Retention
    │   ├── Notifications
    │   ├── Feature Flags
    │   ├── Maintenance
    │   ├── Backup and Recovery
    │   └── Settings History
    │
    └── Audit and Governance
        ├── Audit Dashboard
        ├── System Events
        ├── User Activity
        ├── Trading Decisions
        ├── Risk Decisions
        ├── Execution Events
        ├── Configuration Changes
        ├── Strategy Changes
        ├── Model Changes
        ├── Security Events
        ├── Data Access
        ├── Audit Exports
        └── Retention Policies
```

---

# 3. Recommended Sidebar Display Model

The sidebar should use three visible hierarchy levels:

```text
Functional Area
    Stage or Submodule
        Operational Page
```

Example:

```text
Gold Market Intelligence
    Top-Down Analysis
        H8 Direction and Liquidity
```

Only the active functional area should be expanded by default.

The sidebar must support:

* Expand and collapse
* Persistent expanded state
* Active route highlighting
* Current lifecycle-stage highlighting
* Status indicators
* Alert counters
* Permission filtering
* Tenant filtering after administration is enabled
* Keyboard navigation
* Search
* Command palette
* Compact mode
* Full mode
* Tooltips in collapsed mode
* Mobile drawer
* Recent pages
* Favourite pages

---

# 4. Sidebar Status Indicators

Each stage or module may display a compact status indicator.

| Status | Meaning               |
| ------ | --------------------- |
| Grey   | Not started           |
| Blue   | Running or analysing  |
| Amber  | Waiting or warning    |
| Green  | Passed or completed   |
| Red    | Failed or blocked     |
| Purple | AI processing         |
| Teal   | Managing active trade |
| Black  | Emergency stopped     |

Examples:

```text
Platform Readiness                    82%
Gold Market Intelligence             Analysing
Trading Strategy and Opportunity     3 opportunities
Risk and Execution                   1 pending
Position and Trade Operations        5 active positions
Performance and Control              Learning
```

---

# 5. Modern Next.js Application Folder Structure

The recommended frontend structure is based on:

* Next.js App Router
* TypeScript
* Server and client components
* Feature-based organization
* Dedicated domain modules
* Reusable shared components
* API service boundaries
* Strong separation between UI, domain logic, state, and transport

```text
apps/
└── web/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── loading.tsx
    │   ├── error.tsx
    │   ├── not-found.tsx
    │   │
    │   ├── (gold-trader)/
    │   │   ├── layout.tsx
    │   │   │
    │   │   ├── executive/
    │   │   │   ├── page.tsx
    │   │   │   ├── lifecycle/
    │   │   │   │   └── page.tsx
    │   │   │   ├── workflow-monitor/
    │   │   │   │   └── page.tsx
    │   │   │   ├── trading-operations/
    │   │   │   │   └── page.tsx
    │   │   │   ├── risk-exposure/
    │   │   │   │   └── page.tsx
    │   │   │   ├── performance/
    │   │   │   │   └── page.tsx
    │   │   │   ├── system-health/
    │   │   │   │   └── page.tsx
    │   │   │   ├── alerts/
    │   │   │   │   └── page.tsx
    │   │   │   └── activity/
    │   │   │       └── page.tsx
    │   │   │
    │   │   ├── platform-readiness/
    │   │   │   ├── page.tsx
    │   │   │   ├── start/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── operating-mode/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── trading-profile/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── risk-profile/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── checklist/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   └── history/
    │   │   │   │       └── page.tsx
    │   │   │   │
    │   │   │   ├── initialize/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── engines/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── agents/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── services/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── dependencies/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── configuration/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   └── logs/
    │   │   │   │       └── page.tsx
    │   │   │   │
    │   │   │   ├── connect/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── mt5/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── broker/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── market-data/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── news-calendar/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── database/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── realtime/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   └── history/
    │   │   │   │       └── page.tsx
    │   │   │   │
    │   │   │   ├── validate/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── account/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── gold-symbol/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── broker/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── risk-readiness/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── strategy-readiness/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── reconciliation/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   ├── exceptions/
    │   │   │   │   │   └── page.tsx
    │   │   │   │   └── history/
    │   │   │   │       └── page.tsx
    │   │   │   │
    │   │   │   └── synchronize/
    │   │   │       ├── page.tsx
    │   │   │       ├── timeframes/
    │   │   │       │   └── page.tsx
    │   │   │       ├── market-data/
    │   │   │       │   └── page.tsx
    │   │   │       ├── account-state/
    │   │   │       │   └── page.tsx
    │   │   │       ├── positions-orders/
    │   │   │       │   └── page.tsx
    │   │   │       ├── news/
    │   │   │       │   └── page.tsx
    │   │   │       ├── sessions/
    │   │   │       │   └── page.tsx
    │   │   │       ├── time/
    │   │   │       │   └── page.tsx
    │   │   │       ├── data-quality/
    │   │   │       │   └── page.tsx
    │   │   │       └── history/
    │   │   │           └── page.tsx
    │   │   │
    │   │   ├── market-intelligence/
    │   │   │   ├── page.tsx
    │   │   │   ├── top-down/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── monthly/page.tsx
    │   │   │   │   ├── weekly/page.tsx
    │   │   │   │   ├── daily/page.tsx
    │   │   │   │   ├── h12/page.tsx
    │   │   │   │   ├── h8/page.tsx
    │   │   │   │   ├── intermediate/page.tsx
    │   │   │   │   ├── tactical/page.tsx
    │   │   │   │   ├── execution/page.tsx
    │   │   │   │   ├── alignment/page.tsx
    │   │   │   │   ├── structure-matrix/page.tsx
    │   │   │   │   ├── liquidity-matrix/page.tsx
    │   │   │   │   ├── momentum-matrix/page.tsx
    │   │   │   │   ├── volatility-matrix/page.tsx
    │   │   │   │   └── conflicts/page.tsx
    │   │   │   │
    │   │   │   ├── institutional/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── market-structure/page.tsx
    │   │   │   │   ├── liquidity/page.tsx
    │   │   │   │   ├── liquidity-sweeps/page.tsx
    │   │   │   │   ├── order-blocks/page.tsx
    │   │   │   │   ├── breaker-blocks/page.tsx
    │   │   │   │   ├── mitigation-blocks/page.tsx
    │   │   │   │   ├── fair-value-gaps/page.tsx
    │   │   │   │   ├── balanced-price-ranges/page.tsx
    │   │   │   │   ├── displacement/page.tsx
    │   │   │   │   ├── premium-discount/page.tsx
    │   │   │   │   ├── inducement/page.tsx
    │   │   │   │   ├── accumulation-distribution/page.tsx
    │   │   │   │   ├── price-delivery/page.tsx
    │   │   │   │   ├── targets/page.tsx
    │   │   │   │   └── narrative/page.tsx
    │   │   │   │
    │   │   │   ├── retail/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── trend/page.tsx
    │   │   │   │   ├── support-resistance/page.tsx
    │   │   │   │   ├── trendlines-channels/page.tsx
    │   │   │   │   ├── chart-patterns/page.tsx
    │   │   │   │   ├── candlesticks/page.tsx
    │   │   │   │   ├── moving-averages/page.tsx
    │   │   │   │   ├── momentum/page.tsx
    │   │   │   │   ├── volatility/page.tsx
    │   │   │   │   ├── volume/page.tsx
    │   │   │   │   ├── vwap/page.tsx
    │   │   │   │   ├── fibonacci/page.tsx
    │   │   │   │   ├── breakout-retest/page.tsx
    │   │   │   │   ├── divergence/page.tsx
    │   │   │   │   └── summary/page.tsx
    │   │   │   │
    │   │   │   ├── gold-usd-strength/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── live-matrix/page.tsx
    │   │   │   │   ├── timeframes/page.tsx
    │   │   │   │   ├── gold/page.tsx
    │   │   │   │   ├── usd/page.tsx
    │   │   │   │   ├── differential/page.tsx
    │   │   │   │   ├── acceleration/page.tsx
    │   │   │   │   ├── persistence/page.tsx
    │   │   │   │   ├── divergence/page.tsx
    │   │   │   │   ├── exhaustion/page.tsx
    │   │   │   │   └── history/page.tsx
    │   │   │   │
    │   │   │   ├── usd-news/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── calendar/page.tsx
    │   │   │   │   ├── live-events/page.tsx
    │   │   │   │   ├── countdown/page.tsx
    │   │   │   │   ├── forecast-actual/page.tsx
    │   │   │   │   ├── impact-analysis/page.tsx
    │   │   │   │   ├── historical-reactions/page.tsx
    │   │   │   │   ├── restrictions/page.tsx
    │   │   │   │   ├── stabilization/page.tsx
    │   │   │   │   ├── fed-intelligence/page.tsx
    │   │   │   │   └── history/page.tsx
    │   │   │   │
    │   │   │   ├── sessions/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── asian/page.tsx
    │   │   │   │   ├── london/page.tsx
    │   │   │   │   ├── new-york/page.tsx
    │   │   │   │   ├── overlap/page.tsx
    │   │   │   │   ├── highs-lows/page.tsx
    │   │   │   │   ├── liquidity/page.tsx
    │   │   │   │   ├── sweeps/page.tsx
    │   │   │   │   ├── volatility/page.tsx
    │   │   │   │   ├── transitions/page.tsx
    │   │   │   │   └── history/page.tsx
    │   │   │   │
    │   │   │   ├── market-regime/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── current/page.tsx
    │   │   │   │   ├── transitions/page.tsx
    │   │   │   │   ├── trend/page.tsx
    │   │   │   │   ├── range/page.tsx
    │   │   │   │   ├── breakout/page.tsx
    │   │   │   │   ├── pullback/page.tsx
    │   │   │   │   ├── reversal/page.tsx
    │   │   │   │   ├── news-driven/page.tsx
    │   │   │   │   ├── untradeable/page.tsx
    │   │   │   │   ├── strategy-compatibility/page.tsx
    │   │   │   │   └── history/page.tsx
    │   │   │   │
    │   │   │   └── hybrid-confluence/
    │   │   │       ├── page.tsx
    │   │   │       ├── institutional-retail/page.tsx
    │   │   │       ├── evidence/page.tsx
    │   │   │       ├── conflicts/page.tsx
    │   │   │       ├── narrative/page.tsx
    │   │   │       ├── confidence/page.tsx
    │   │   │       ├── buy-scenario/page.tsx
    │   │   │       ├── sell-scenario/page.tsx
    │   │   │       ├── wait-scenario/page.tsx
    │   │   │       └── history/page.tsx
    │   │   │
    │   │   ├── strategy-opportunity/
    │   │   │   ├── page.tsx
    │   │   │   ├── plan/
    │   │   │   ├── strategy-library/
    │   │   │   ├── scan/
    │   │   │   └── qualify/
    │   │   │
    │   │   ├── risk-execution/
    │   │   │   ├── page.tsx
    │   │   │   ├── risk-control/
    │   │   │   ├── authorize/
    │   │   │   └── execute/
    │   │   │
    │   │   ├── trade-operations/
    │   │   │   ├── page.tsx
    │   │   │   ├── manage/
    │   │   │   └── close/
    │   │   │
    │   │   ├── performance-control/
    │   │   │   ├── page.tsx
    │   │   │   ├── review/
    │   │   │   ├── learn/
    │   │   │   ├── repeat/
    │   │   │   └── stop/
    │   │   │
    │   │   └── administration/
    │   │       ├── page.tsx
    │   │       ├── tenants/
    │   │       ├── users/
    │   │       ├── access-control/
    │   │       ├── authentication/
    │   │       ├── trading-environments/
    │   │       ├── trading-configuration/
    │   │       ├── integrations/
    │   │       ├── system-settings/
    │   │       └── audit/
    │   │
    │   └── api/
    │       ├── health/
    │       ├── lifecycle/
    │       ├── market-data/
    │       ├── analysis/
    │       ├── opportunities/
    │       ├── risk/
    │       ├── execution/
    │       ├── positions/
    │       ├── reviews/
    │       └── administration/
    │
    ├── components/
    │   ├── layout/
    │   │   ├── app-shell.tsx
    │   │   ├── sidebar.tsx
    │   │   ├── sidebar-group.tsx
    │   │   ├── sidebar-item.tsx
    │   │   ├── topbar.tsx
    │   │   ├── breadcrumb.tsx
    │   │   ├── command-palette.tsx
    │   │   └── mobile-navigation.tsx
    │   │
    │   ├── lifecycle/
    │   ├── trading/
    │   ├── charts/
    │   ├── tables/
    │   ├── status/
    │   ├── alerts/
    │   ├── dialogs/
    │   ├── forms/
    │   └── ui/
    │
    ├── features/
    │   ├── executive/
    │   ├── platform-readiness/
    │   ├── market-intelligence/
    │   ├── strategy-opportunity/
    │   ├── risk-execution/
    │   ├── trade-operations/
    │   ├── performance-control/
    │   └── administration/
    │
    ├── config/
    │   ├── navigation.ts
    │   ├── routes.ts
    │   ├── lifecycle.ts
    │   ├── permissions.ts
    │   ├── feature-flags.ts
    │   └── environment.ts
    │
    ├── hooks/
    │   ├── use-lifecycle.ts
    │   ├── use-market-data.ts
    │   ├── use-opportunities.ts
    │   ├── use-positions.ts
    │   ├── use-risk.ts
    │   ├── use-websocket.ts
    │   └── use-permissions.ts
    │
    ├── lib/
    │   ├── api-client.ts
    │   ├── websocket-client.ts
    │   ├── formatting.ts
    │   ├── validation.ts
    │   ├── dates.ts
    │   ├── trading-math.ts
    │   ├── permissions.ts
    │   └── errors.ts
    │
    ├── services/
    │   ├── lifecycle.service.ts
    │   ├── market-data.service.ts
    │   ├── analysis.service.ts
    │   ├── news.service.ts
    │   ├── opportunity.service.ts
    │   ├── risk.service.ts
    │   ├── execution.service.ts
    │   ├── position.service.ts
    │   ├── review.service.ts
    │   ├── learning.service.ts
    │   └── administration.service.ts
    │
    ├── stores/
    │   ├── lifecycle.store.ts
    │   ├── market.store.ts
    │   ├── opportunity.store.ts
    │   ├── execution.store.ts
    │   ├── position.store.ts
    │   ├── alert.store.ts
    │   └── navigation.store.ts
    │
    ├── types/
    │   ├── lifecycle.ts
    │   ├── market.ts
    │   ├── analysis.ts
    │   ├── opportunity.ts
    │   ├── risk.ts
    │   ├── execution.ts
    │   ├── position.ts
    │   ├── review.ts
    │   ├── administration.ts
    │   └── common.ts
    │
    └── tests/
        ├── unit/
        ├── integration/
        ├── components/
        ├── accessibility/
        └── e2e/
```

---

# 6. Feature Module Folder Pattern

Every functional feature should use the same internal structure.

Example:

```text
features/
└── market-intelligence/
    ├── components/
    ├── hooks/
    ├── services/
    ├── stores/
    ├── schemas/
    ├── types/
    ├── utils/
    ├── constants/
    └── tests/
```

A more detailed example:

```text
features/
└── market-intelligence/
    ├── top-down/
    │   ├── components/
    │   │   ├── timeframe-alignment-matrix.tsx
    │   │   ├── direction-summary.tsx
    │   │   ├── structure-summary.tsx
    │   │   ├── liquidity-summary.tsx
    │   │   └── timeframe-detail-panel.tsx
    │   ├── hooks/
    │   │   ├── use-top-down-analysis.ts
    │   │   └── use-timeframe-analysis.ts
    │   ├── services/
    │   │   └── top-down.service.ts
    │   ├── stores/
    │   │   └── top-down.store.ts
    │   ├── schemas/
    │   │   └── top-down.schema.ts
    │   ├── types/
    │   │   └── top-down.types.ts
    │   └── tests/
    │
    ├── institutional/
    ├── retail/
    ├── gold-usd-strength/
    ├── usd-news/
    ├── sessions/
    ├── market-regime/
    └── hybrid-confluence/
```

---

# 7. Backend Folder Structure

The backend should remain aligned with the agreed Node.js and TypeScript stack.

```text
apps/
└── api/
    └── src/
        ├── main.ts
        ├── app.ts
        │
        ├── config/
        │   ├── environment.ts
        │   ├── database.ts
        │   ├── mt5.ts
        │   ├── news.ts
        │   └── risk.ts
        │
        ├── modules/
        │   ├── lifecycle/
        │   ├── platform-readiness/
        │   ├── market-data/
        │   ├── market-intelligence/
        │   ├── strategy/
        │   ├── opportunity/
        │   ├── risk/
        │   ├── authorization/
        │   ├── execution/
        │   ├── positions/
        │   ├── baskets/
        │   ├── closures/
        │   ├── reviews/
        │   ├── learning/
        │   ├── administration/
        │   └── audit/
        │
        ├── orchestration/
        │   ├── lifecycle-orchestrator.ts
        │   ├── analysis-orchestrator.ts
        │   ├── opportunity-orchestrator.ts
        │   ├── execution-orchestrator.ts
        │   └── learning-orchestrator.ts
        │
        ├── agents/
        │   ├── market-analyst.agent.ts
        │   ├── institutional-trader.agent.ts
        │   ├── retail-trader.agent.ts
        │   ├── news-analyst.agent.ts
        │   ├── strategy-planner.agent.ts
        │   ├── opportunity-qualifier.agent.ts
        │   ├── risk-officer.agent.ts
        │   ├── execution.agent.ts
        │   ├── position-manager.agent.ts
        │   ├── trade-reviewer.agent.ts
        │   └── learning.agent.ts
        │
        ├── integrations/
        │   ├── mt5/
        │   ├── broker/
        │   ├── market-data/
        │   ├── news/
        │   ├── economic-calendar/
        │   └── notifications/
        │
        ├── database/
        │   ├── migrations/
        │   ├── repositories/
        │   ├── entities/
        │   ├── views/
        │   └── seeds/
        │
        ├── events/
        │   ├── publishers/
        │   ├── subscribers/
        │   ├── handlers/
        │   └── event-types.ts
        │
        ├── websocket/
        │   ├── gateway.ts
        │   ├── channels.ts
        │   └── messages.ts
        │
        ├── jobs/
        │   ├── market-sync.job.ts
        │   ├── news-sync.job.ts
        │   ├── session-reset.job.ts
        │   ├── daily-review.job.ts
        │   └── backup.job.ts
        │
        ├── shared/
        │   ├── errors/
        │   ├── logging/
        │   ├── validation/
        │   ├── security/
        │   ├── math/
        │   ├── time/
        │   └── constants/
        │
        └── tests/
            ├── unit/
            ├── integration/
            ├── orchestration/
            └── execution/
```

---

# 8. Navigation Configuration Structure

The sidebar should be generated from configuration instead of being hard-coded into individual components.

```text
apps/web/config/
├── navigation.ts
├── navigation-status.ts
├── lifecycle.ts
├── route-metadata.ts
├── permissions.ts
└── feature-flags.ts
```

Each sidebar item should support:

* ID
* Label
* Description
* Route
* Icon
* Parent ID
* Lifecycle stage
* Functional area
* Display order
* Permission code
* Feature flag
* Status source
* Alert source
* Disabled state
* Administration phase
* Search keywords

Example conceptual definition:

```text
{
  id: "market-intelligence.top-down.h8",
  label: "H8 Direction and Liquidity",
  route: "/market-intelligence/top-down/h8",
  area: "market-intelligence",
  lifecycleStage: "analyse",
  permission: "market_intelligence.h8.view",
  featureFlag: "h8_analysis_enabled",
  statusSource: "analysis.h8.status",
  order: 5
}
```

---

# 9. Route Naming Standards

Use lowercase kebab-case for routes:

```text
/gold-usd-strength
/fair-value-gaps
/risk-readiness
/position-sizing
/champion-challenger
```

Use PascalCase for React component names:

```text
GoldUsdStrengthMatrix
FairValueGapMonitor
RiskReadinessPanel
PositionSizingCalculator
ChampionChallengerDashboard
```

Use dot-separated permission identifiers:

```text
executive.dashboard.view
platform.start.execute
market.h8.view
opportunity.qualify.execute
risk.authorization.approve
execution.orders.submit
positions.basket.manage
review.trade.view
learning.models.promote
administration.tenants.manage
```

---

# 10. Page Component Standard

Every operational page should contain:

```text
Page Header
├── Page title
├── Breadcrumb
├── Lifecycle-stage indicator
├── System state
├── Last update
└── Relevant actions

Executive Summary
├── Status cards
├── KPIs
├── Current decision
└── Alerts

Primary Workspace
├── Operational data
├── Charts or matrices
├── Tables
├── Decision evidence
└── Drill-down details

Autonomous Activity
├── Current action
├── Latest outputs
├── Next expected action
└── Blocking condition

Audit and History
├── Event timeline
├── Previous decisions
├── Errors
└── Changes
```

---

# 11. Administration Release Strategy

The Administration area must exist in the folder and route structure from the beginning but remain feature-flagged.

```text
administration_enabled = false
authentication_enabled = false
tenant_isolation_enabled = false
role_enforcement_enabled = false
```

During initial development:

* Routes may display “Planned after system certification.”
* No login/logout requirement should block development.
* No tenant scoping should affect trading operations.
* The operational lifecycle must be completed and certified first.

After certification:

```text
administration_enabled = true
authentication_enabled = true
tenant_isolation_enabled = true
role_enforcement_enabled = true
```

The system can then activate:

* Tenant management
* User administration
* Roles and permissions
* Authentication
* MFA
* Session control
* Audit access rules
* Tenant data isolation

---

# 12. Final Recommended Top-Level Sidebar

```text
Gold Trader

01  Executive Command Centre
02  Platform Readiness
03  Gold Market Intelligence
04  Trading Strategy and Opportunity
05  Risk, Authorization and Execution
06  Position and Trade Operations
07  Performance, Learning and Control
08  Platform Administration
```

The lifecycle is mapped as follows:

```text
START          → Platform Readiness
INITIALIZE     → Platform Readiness
CONNECT        → Platform Readiness
VALIDATE       → Platform Readiness
SYNCHRONIZE    → Platform Readiness

ANALYSE        → Gold Market Intelligence

PLAN           → Trading Strategy and Opportunity
SCAN           → Trading Strategy and Opportunity
QUALIFY        → Trading Strategy and Opportunity

AUTHORIZE      → Risk, Authorization and Execution
EXECUTE        → Risk, Authorization and Execution

MANAGE         → Position and Trade Operations
CLOSE          → Position and Trade Operations

REVIEW         → Performance, Learning and Control
LEARN          → Performance, Learning and Control
REPEAT         → Performance, Learning and Control
STOP           → Performance, Learning and Control
```

The **Executive Command Centre** monitors all stages, and **Platform Administration** governs the platform after certification.
