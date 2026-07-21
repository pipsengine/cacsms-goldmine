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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StartupHistorySnapshot } from "@/types/startup-history";
import styles from "./startup-history-page.module.css";

const REFRESH_INTERVAL_MS = 5000;
const sources = [
  ["Lifecycle Orchestrator", "Runtime transitions and decisions", Workflow],
  ["Independent Risk Officer", "Risk profile and veto evidence", ShieldCheck],
  ["Readiness Controller", "Production pre-start results", CheckCircle2],
  ["Audit Store", "Append-only session records and hashes", Database],
] as const;

export function StartupHistoryPage() {
  const [snapshot, setSnapshot] = useState<StartupHistorySnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState("All outcomes");
  const [streamMode, setStreamMode] = useState<"connecting" | "live" | "polling">("connecting");
  const [error, setError] = useState<string | null>(null);
  const refreshPending = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    try {
      const response = await fetch("/api/platform-readiness/startup-history", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Startup history failed with ${response.status}`);
      const payload = await response.json() as StartupHistorySnapshot;
      if (!mounted.current) return;
      setSnapshot(payload);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Unable to refresh startup history.");
    } finally {
      refreshPending.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let stream: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (!mounted.current) return;
      const next = new EventSource("/api/platform-readiness/startup-history/stream");
      stream = next;
      next.addEventListener("open", () => setStreamMode("live"));
      next.addEventListener("snapshot", (event) => {
        try {
          setSnapshot(JSON.parse((event as MessageEvent).data) as StartupHistorySnapshot);
          setError(null);
          setStreamMode("live");
        } catch {
          setError("A startup-history event could not be decoded.");
        }
      });
      next.addEventListener("error", () => {
        if (stream === next) stream = null;
        next.close();
        setStreamMode("polling");
        if (mounted.current && reconnectTimer === null) reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 3000);
      });
    };

    const pollTimer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onRuntimeUpdate = () => void refresh();
    window.addEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    connect();
    void refresh();

    return () => {
      mounted.current = false;
      stream?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    };
  }, [refresh]);

  const records = useMemo(() => (snapshot?.records ?? []).filter((record) => {
    const matchesQuery = !query || `${record.cycleId} ${record.correlationId}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (outcome === "All outcomes" || record.outcome === outcome);
  }), [outcome, query, snapshot?.records]);
  const latestRecord = snapshot?.records[0] ?? null;
  const timestamp = formatTime(snapshot?.updatedAt);

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><span>Platform Readiness</span><ChevronRight size={13} /><span>Start</span><ChevronRight size={13} /><strong>Startup History</strong></nav>

      <header className={styles.headingRow}>
        <div>
          <div className={styles.titleRow}><span className={styles.stageNumber}>01</span><div><p>Autonomous lifecycle audit</p><h1>Startup History</h1></div></div>
          <div className={styles.metadata}><span className={styles.primaryTag}>START</span><span>Mode: Fully Autonomous</span><span>Store: Session append-only</span><span>Capacity: 200 records</span><span>Audit: audit.platform-readiness.start.startup-history</span></div>
        </div>
        <div className={styles.streamStatus}><small>Event Stream</small><strong><i /><Radio size={14} />{streamMode === "live" ? "Live" : streamMode === "polling" ? "Polling fallback" : "Connecting"} · {timestamp}</strong></div>
      </header>

      {error ? <div className={styles.errorBanner} role="alert"><TriangleAlert size={14} />{error}</div> : null}

      <section className={styles.summaryGrid} aria-live="polite">
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.purple}`}><History size={21} /></span><div><small>Recorded Cycles</small><strong>{snapshot?.summary.recordedCycles ?? "—"}</strong><p>Current server session</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.green}`}><CheckCircle2 size={21} /></span><div><small>Successful Starts</small><strong>{snapshot?.summary.successfulStarts ?? "—"}</strong><p>Authorized assessments</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.blue}`}><Timer size={21} /></span><div><small>Average Duration</small><strong>{formatDuration(snapshot?.summary.averageDurationMs)}</strong><p>Completed timed cycles</p></div></article>
        <article className={styles.summaryCard}><span className={`${styles.summaryIcon} ${styles.orange}`}><TriangleAlert size={21} /></span><div><small>Blocked Starts</small><strong>{snapshot?.summary.blockedStarts ?? "—"}</strong><p>Held by readiness policy</p></div></article>
      </section>

      <div className={styles.pageGrid}>
        <section className={styles.mainColumn}>
          <article className={styles.monitorCard}>
            <header className={styles.cardHeader}><div className={styles.cardTitle}><span><Bot size={19} /></span><div><h2>Autonomous Startup Monitor</h2><p>Live lifecycle and assessment events captured without operator action.</p></div></div><div className={styles.monitorBadge}><i />Monitoring continuously</div></header>
            <div className={styles.monitorBody}>
              <div className={styles.cycleIdentity}><span><CircleDashed size={31} /></span><div><small>Latest audit cycle</small><strong>{latestRecord?.cycleId ?? "AWAITING-FIRST-ASSESSMENT"}</strong><p>{latestRecord ? `${latestRecord.outcome} · ${latestRecord.checksPassed}/${latestRecord.checksRequired} required checks passed.` : "The monitor is subscribed and will capture the next production pre-start assessment."}</p></div></div>
              <div className={styles.eventTimeline}>
                {(snapshot?.events ?? []).map((event) => <div className={styles.event} key={event.id}><span className={styles[`event_${event.status}`]}>{event.status === "complete" ? <CheckCircle2 size={14} /> : event.status === "waiting" ? <Clock3 size={14} /> : <CircleDashed size={14} />}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>{formatTime(event.timestamp)}</time></div>)}
                {!snapshot?.events.length ? <div className={styles.event}><span className={styles.event_pending}><CircleDashed size={14} /></span><div><strong>Connecting to audit stream</strong><p>Waiting for the first live snapshot.</p></div><time>Queued</time></div> : null}
              </div>
            </div>
          </article>

          <article className={styles.historyCard}>
            <header className={styles.historyHeader}><div><h2>Startup Cycle Records</h2><p>Read-only assessment decisions, evidence, outcomes, and integrity.</p></div><div className={styles.historyTools}><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cycle ID" aria-label="Search startup history" /></label><select value={outcome} onChange={(event) => setOutcome(event.target.value)} aria-label="Filter by outcome"><option>All outcomes</option><option>Successful</option><option>Blocked</option><option>Failed</option></select></div></header>
            <div className={styles.tableWrap}>
              <table><thead><tr><th>Cycle ID</th><th>Initiated</th><th>Mode</th><th>Duration</th><th>Decision</th><th>Checks</th><th>Integrity</th><th>Correlation</th></tr></thead>
                <tbody>{records.map((record) => <tr className={styles.recordRow} key={record.correlationId}><td><strong>{record.cycleId}</strong></td><td>{formatDateTime(record.initiatedAt)}</td><td>{titleCase(record.mode)}</td><td>{formatDuration(record.durationMs)}</td><td><span className={`${styles.outcomeBadge} ${styles[`outcome_${record.outcome.toLowerCase().replace(" ", "_")}`]}`}>{record.outcome}</span></td><td>{record.checksPassed}/{record.checksRequired}</td><td><span className={record.integrityVerified ? styles.integrityGood : styles.integrityBad}>{record.integrityVerified ? "Verified" : "Failed"}</span></td><td title={record.correlationId}>{compactId(record.correlationId)}</td></tr>)}</tbody>
                {!records.length ? <tbody><tr className={styles.emptyRow}><td colSpan={8}><div><Archive size={31} /><strong>No startup cycles found</strong><p>{query || outcome !== "All outcomes" ? "No records match the current history filters." : "Records will appear automatically after the next production pre-start assessment."}</p></div></td></tr></tbody> : null}
              </table>
            </div>
            <footer className={styles.tableFooter}><span>Showing {records.length} of {snapshot?.records.length ?? 0} startup records</span><span>{streamMode === "live" ? "Live updates enabled" : "Polling fallback active"} <i /></span></footer>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}><h3>Audit Integrity</h3><div className={styles.integrityState}><Fingerprint size={25} /><div><small>Verification state</small><strong>{snapshot ? `${snapshot.integrity.verified} verified · ${snapshot.integrity.failed} failed` : "Checking records"}</strong></div></div><dl className={styles.railDetails}><div><dt>Storage</dt><dd>Process memory</dd></div><div><dt>Write model</dt><dd>Append only</dd></div><div><dt>Digest</dt><dd>SHA-256</dd></div><div><dt>Clock source</dt><dd>Africa/Lagos</dd></div><div><dt>Runtime</dt><dd>{titleCase(snapshot?.runtime.status ?? "connecting")}</dd></div></dl></article>
          <article className={styles.railCard}><h3>Autonomous Sources</h3><div className={styles.sourceList}>{sources.map(([title, detail, Icon]) => <div key={title}><span><Icon size={15} /></span><div><strong>{title}</strong><small>{detail}</small></div><i /></div>)}</div></article>
          <article className={styles.railCard}><h3>Session Retention</h3><div className={styles.retentionGraphic}><CalendarClock size={28} /><div><strong>200 records</strong><small>Bounded server-session history</small></div></div><ul className={styles.policyList}><li><FileCheck2 size={13} />Complete checklist outcome</li><li><FileClock size={13} />ISO event ordering</li><li><LockKeyhole size={13} />SHA-256 integrity digest</li><li><Archive size={13} />Oldest records rotate at limit</li></ul></article>
        </aside>
      </div>
    </main>
  );
}

function formatTime(value?: string | null) {
  if (!value) return "--:--:--";
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

function formatDuration(value?: number | null) {
  if (value === null || value === undefined) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function compactId(value: string) {
  return value.length > 18 ? `${value.slice(0, 14)}…` : value;
}

function titleCase(value: string) {
  return value.replace(/(^|[-_\s])\w/g, (character) => character.toUpperCase());
}
