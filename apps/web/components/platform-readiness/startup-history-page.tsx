"use client";

import {
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  FileCheck2,
  FileClock,
  Fingerprint,
  History,
  LockKeyhole,
  Radio,
  Search,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./startup-history-page.module.css";

const currentCycleEvents = [
  { title: "Autonomous monitor attached", detail: "Startup event stream subscription requested.", status: "complete" },
  { title: "History repository check", detail: "Waiting for the production audit repository adapter.", status: "waiting" },
  { title: "Integrity verification", detail: "Hash-chain verification begins when persisted records are available.", status: "pending" },
  { title: "Lifecycle correlation", detail: "Startup cycles will correlate with validation and risk decisions.", status: "pending" },
] as const;

const sources = [
  ["Lifecycle Orchestrator", "Startup transitions and decisions", Workflow],
  ["Independent Risk Officer", "Risk profile and veto evidence", ShieldCheck],
  ["Readiness Controller", "Pre-start validation results", CheckCircle2],
  ["Audit Repository", "Immutable events and record hashes", Database],
] as const;

export function StartupHistoryPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("All outcomes");

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timestamp = useMemo(() => now ? new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now) : "--:--:--", [now]);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span><ChevronRight size={13} />
        <span>Start</span><ChevronRight size={13} />
        <strong>Startup History</strong>
      </nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>01</span>
            <div><p>Autonomous lifecycle audit</p><h1>Startup History</h1></div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>START</span>
            <span>Mode: Fully Autonomous</span>
            <span>Record policy: Immutable</span>
            <span>Retention: 7 years</span>
            <span>Audit: audit.platform-readiness.start.startup-history</span>
          </div>
        </div>
        <div className={styles.streamStatus}><small>Event Stream</small><strong><i /><Radio size={14} />Listening · {timestamp}</strong></div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.purple}`}><History size={21} /></span><div><small>Recorded Cycles</small><strong>0</strong><p>Repository not connected</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.green}`}><CheckCircle2 size={21} /></span><div><small>Successful Starts</small><strong>—</strong><p>Awaiting persisted outcomes</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.blue}`}><Timer size={21} /></span><div><small>Average Duration</small><strong>—</strong><p>No completed cycles</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.orange}`}><TriangleAlert size={21} /></span><div><small>Startup Incidents</small><strong>0</strong><p>No persisted incidents</p></div></article>
      </section>

      <div className={styles.pageGrid}>
        <section className={styles.mainColumn}>
          <article className={styles.monitorCard}>
            <header className={styles.cardHeader}>
              <div className={styles.cardTitle}><span><Bot size={19} /></span><div><h2>Autonomous Startup Monitor</h2><p>Live lifecycle events are captured without operator action.</p></div></div>
              <div className={styles.monitorBadge}><i />Monitoring continuously</div>
            </header>
            <div className={styles.monitorBody}>
              <div className={styles.cycleIdentity}>
                <span><CircleDashed size={31} /></span>
                <div><small>Current audit session</small><strong>AWAITING-PRODUCTION-STREAM</strong><p>The autonomous system remains subscribed and will persist the next startup event at source.</p></div>
              </div>
              <div className={styles.eventTimeline}>
                {currentCycleEvents.map((event, index) => (
                  <div className={styles.event} key={event.title}>
                    <span className={styles[`event_${event.status}`]}>{event.status === "complete" ? <CheckCircle2 size={14} /> : event.status === "waiting" ? <Clock3 size={14} /> : <CircleDashed size={14} />}</span>
                    <div><strong>{event.title}</strong><p>{event.detail}</p></div>
                    <time>{index === 0 ? timestamp : "Queued"}</time>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className={styles.historyCard}>
            <header className={styles.historyHeader}>
              <div><h2>Startup Cycle Records</h2><p>Read-only autonomous decisions, evidence, outcomes, and reconciliation.</p></div>
              <div className={styles.historyTools}>
                <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cycle ID" aria-label="Search startup history" /></label>
                <select value={outcome} onChange={(event) => setOutcome(event.target.value)} aria-label="Filter by outcome"><option>All outcomes</option><option>Successful</option><option>Blocked</option><option>Failed</option></select>
              </div>
            </header>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Cycle ID</th><th>Initiated</th><th>Mode</th><th>Duration</th><th>Decision</th><th>Checks</th><th>Integrity</th><th /></tr></thead>
                <tbody><tr className={styles.emptyRow}><td colSpan={8}><div><Archive size={31} /><strong>No persisted startup cycles</strong><p>{query || outcome !== "All outcomes" ? "No records match the current history filters." : "Records will appear automatically when the production audit repository returns startup history."}</p></div></td></tr></tbody>
              </table>
            </div>
            <footer className={styles.tableFooter}><span>Showing 0 autonomous startup records</span><span>Live updates enabled <i /></span></footer>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <h3>Audit Integrity</h3>
            <div className={styles.integrityState}><Fingerprint size={25} /><div><small>Verification state</small><strong>Awaiting repository</strong></div></div>
            <dl className={styles.railDetails}>
              <div><dt>Storage</dt><dd>Append only</dd></div>
              <div><dt>Hash chain</dt><dd>Required</dd></div>
              <div><dt>Decision evidence</dt><dd>Required</dd></div>
              <div><dt>Clock source</dt><dd>Africa/Lagos</dd></div>
              <div><dt>Manual edits</dt><dd className={styles.prohibited}>Prohibited</dd></div>
            </dl>
          </article>

          <article className={styles.railCard}>
            <h3>Autonomous Sources</h3>
            <div className={styles.sourceList}>{sources.map(([title, detail, Icon]) => <div key={title}><span><Icon size={15} /></span><div><strong>{title}</strong><small>{detail}</small></div><i /></div>)}</div>
          </article>

          <article className={styles.railCard}>
            <h3>Retention Policy</h3>
            <div className={styles.retentionGraphic}><CalendarClock size={28} /><div><strong>7 years</strong><small>Minimum immutable retention</small></div></div>
            <ul className={styles.policyList}>
              <li><FileCheck2 size={13} />Complete decision rationale</li>
              <li><FileClock size={13} />Millisecond event ordering</li>
              <li><LockKeyhole size={13} />Encrypted evidence payloads</li>
              <li><Archive size={13} />Automated archival lifecycle</li>
            </ul>
          </article>
        </aside>
      </div>
    </main>
  );
}
