import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Database,
  Info,
  LayoutDashboard,
  MonitorCheck,
  PauseCircle,
  RadioTower,
  RefreshCw,
  RotateCw,
  Server,
} from "lucide-react";
import styles from "./start-page.module.css";

const statusCards = [
  {
    label: "Status",
    value: "Waiting",
    tone: "purple",
    description: "Operational data will be loaded from platform-readiness.start.status.",
    icon: RadioTower,
  },
  {
    label: "KPI Live",
    value: "Ready",
    tone: "green",
    description: "Production database and real-time service bindings are required.",
    icon: CircleGauge,
  },
  {
    label: "Decision",
    value: "Hold",
    tone: "orange",
    description: "Current decision remains empty until backend integration completes.",
    icon: PauseCircle,
  },
  {
    label: "Alerts",
    value: "0",
    tone: "red",
    description: "Alert stream: platform-readiness.start.alerts.",
    icon: Bell,
  },
] as const;

const recentActivity = [
  ["Platform readiness check initiated", "08:35:09"],
  ["Waiting for operational data", "08:35:09"],
  ["KPI Live binding validated", "08:35:09"],
  ["Decision hold initialized", "08:35:09"],
  ["Alert stream connected", "08:35:09"],
] as const;

export function StartPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>Start</strong>
      </nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>01</span>
            <div>
              <p className={styles.eyebrow}>Lifecycle stage</p>
              <h1>Start</h1>
            </div>
          </div>

          <div className={styles.metadata}>
            <span className={styles.primaryTag}>START</span>
            <span>Platform Readiness</span>
            <span>System State: Connected Service Pending</span>
            <span>Last Update: Real-time Source Required</span>
            <span>Audit: Health Platform Readiness Start</span>
          </div>
        </div>

        <div className={styles.stageStatus}>
          <small>Stage Status</small>
          <strong><i />Waiting</strong>
        </div>
      </header>

      <div className={styles.pageGrid}>
        <section className={styles.mainColumn} aria-label="Start stage workspace">
          <div className={styles.statusGrid}>
            {statusCards.map(({ icon: Icon, ...card }) => (
              <article className={styles.statusCard} key={card.label}>
                <div className={styles.cardTopRow}>
                  <span className={`${styles.statusIcon} ${styles[card.tone]}`}>
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <button type="button" aria-label={`Open ${card.label}`}><ChevronRight size={17} /></button>
                </div>
                <small>{card.label}</small>
                <strong className={styles[`${card.tone}Text`]}>{card.value}</strong>
                <p>{card.description}</p>
              </article>
            ))}
          </div>

          <article className={styles.workspace}>
            <header className={styles.workspaceHeader}>
              <span><LayoutDashboard size={20} /></span>
              <div>
                <h2>Primary Workspace</h2>
                <p>Production service readiness and operational binding status</p>
              </div>
            </header>

            <div className={styles.workspaceBody}>
              <dl className={styles.workspaceDetails}>
                <div><dt>Operational data</dt><dd>No mock records. Connect production source.</dd></div>
                <div><dt>Charts</dt><dd>No real-time market visualization boundary.</dd></div>
                <div><dt>Tables</dt><dd>Empty state active.</dd></div>
                <div><dt>Decision evidence</dt><dd>Awaiting backend evidence payload.</dd></div>
                <div><dt>Drill-down details</dt><dd>Audit identity platform readiness start.</dd></div>
                <div><dt>Permission</dt><dd><strong>platform-readiness.start.view</strong></dd></div>
              </dl>

              <div className={styles.illustration} aria-hidden="true">
                <div className={styles.illustrationGlow} />
                <div className={styles.serverGraphic}>
                  <Server size={96} strokeWidth={1.25} />
                  <span className={styles.dataPulse}><Database size={22} /></span>
                </div>
                <div className={styles.monitorGraphic}>
                  <MonitorCheck size={100} strokeWidth={1.25} />
                </div>
                <span className={styles.successCheck}><Check size={16} strokeWidth={3} /></span>
              </div>
            </div>
          </article>

          <article className={styles.actionsCard}>
            <h2>Actions</h2>
            <div className={styles.actionButtons}>
              <button type="button"><RotateCw size={15} />Retry</button>
              <button type="button"><RefreshCw size={15} />Sync</button>
              <button type="button"><CheckCircle2 size={15} />Acknowledge</button>
            </div>
            <div className={styles.emptyState}>
              <span><Info size={12} /></span>
              <p>Empty state: no production records have been returned for this workspace.</p>
            </div>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <h3>Stage Progress</h3>
            <div className={styles.progressRing}><div><strong>0%</strong><span>Complete</span></div></div>
            <ul className={styles.progressLegend}>
              <li><i className={styles.completedDot} /><span>Completed</span><b>0</b></li>
              <li><i className={styles.inProgressDot} /><span>In Progress</span><b>0</b></li>
              <li><i className={styles.pendingDot} /><span>Pending</span><b>17</b></li>
              <li><i className={styles.blockedDot} /><span>Blocked</span><b>0</b></li>
            </ul>
          </article>

          <article className={styles.railCard}>
            <h3>Stage Information</h3>
            <dl className={styles.stageInformation}>
              <div><dt>Stage Name</dt><dd>Start</dd></div>
              <div><dt>Stage Order</dt><dd>1 of 17</dd></div>
              <div><dt>Group</dt><dd>Platform Readiness</dd></div>
              <div><dt>Dependencies</dt><dd>None</dd></div>
              <div><dt>Est. Duration</dt><dd>—</dd></div>
              <div><dt>Automated</dt><dd><span className={styles.automatedBadge}>Yes</span></dd></div>
            </dl>
          </article>

          <article className={styles.railCard}>
            <h3>Recent Activity</h3>
            <div className={styles.activityList}>
              {recentActivity.map(([description, time], index) => (
                <div className={styles.activityItem} key={description}>
                  <span className={styles.activityIcon}><Activity size={12} /></span>
                  <p>{description}</p>
                  <time>{time}</time>
                  {index < recentActivity.length - 1 ? <i /> : null}
                </div>
              ))}
            </div>
            <button className={styles.viewActivityButton} type="button">View All Activity<ChevronRight size={13} /></button>
          </article>
        </aside>
      </div>
    </main>
  );
}
