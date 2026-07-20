import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Info,
  LayoutDashboard,
  PauseCircle,
  RadioTower,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import styles from "./trading-profile-page.module.css";

const statusRows = [
  {
    title: "Status",
    value: "Waiting",
    tone: "purple",
    detail: "Operational data will be loaded from platform-readiness.start.trading-profile.status.",
    icon: RadioTower,
  },
  {
    title: "KPI Live",
    value: "Live",
    tone: "green",
    detail: "Production database and realtime service bindings are required.",
    icon: CircleGauge,
  },
  {
    title: "Decision",
    value: "Hold",
    tone: "orange",
    detail: "Current decision remains empty until backend integration completes.",
    icon: PauseCircle,
  },
  {
    title: "Alerts",
    value: "0",
    tone: "red",
    detail: "Alert stream: platform-readiness.start.trading-profile.alerts.",
    icon: Bell,
  },
] as const;

export function TradingProfilePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} aria-hidden="true" />
        <span>Start</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>Trading Profile</strong>
      </nav>

      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Lifecycle configuration</p>
        <h1>Trading Profile</h1>
        <div className={styles.metadata}>
          <span className={styles.primaryTag}>START</span>
          <span>Platform Readiness</span>
          <span>System state: connected service pending</span>
          <span>Last update: realtime source required</span>
          <span>Audit: audit.platform-readiness.start.trading-profile</span>
        </div>
      </header>

      <section className={styles.statusList} aria-label="Trading profile status">
        {statusRows.map(({ icon: Icon, ...row }) => (
          <article className={styles.statusRow} key={row.title}>
            <span className={`${styles.statusIcon} ${styles[row.tone]}`}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <div className={styles.statusIdentity}>
              <span>{row.title}</span>
              <strong className={styles[`${row.tone}Text`]}>{row.value}</strong>
            </div>
            <p>{row.detail}</p>
            <button type="button" aria-label={`Open ${row.title}`}><ChevronRight size={18} /></button>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <header>
          <span><LayoutDashboard size={20} /></span>
          <div>
            <h2>Primary Workspace</h2>
            <p>Trading profile data, decision evidence, and service bindings</p>
          </div>
        </header>

        <div className={styles.workspaceBody}>
          <dl>
            <div><dt>Operational data</dt><dd>No mock records. Connect production source.</dd></div>
            <div><dt>Charts or matrices</dt><dd>Realtime market visualization boundary.</dd></div>
            <div><dt>Tables</dt><dd>Empty state active.</dd></div>
            <div><dt>Decision evidence</dt><dd>Awaiting backend evidence payload.</dd></div>
            <div><dt>Drill-down details</dt><dd>Route identity: platform-readiness.start.trading-profile</dd></div>
            <div><dt>Permission</dt><dd><strong>platform-readiness.start.trading-profile.view</strong></dd></div>
          </dl>
        </div>
      </section>

      <section className={styles.actions}>
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
      </section>
    </main>
  );
}
