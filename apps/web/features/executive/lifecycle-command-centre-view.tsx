"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  Grid2X2,
  LineChart,
  List,
  Power,
  Rocket,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { fetchLifecycleSnapshot, openLifecycleStream } from "@/lib/lifecycle-api";
import type { LifecycleSnapshot, LifecycleStatus } from "@/types/lifecycle";
import { lifecycleSnapshot } from "./lifecycle-command-centre-data";
import styles from "./lifecycle-command-centre.module.css";

const statusLabel: Record<LifecycleStatus, string> = {
  "not-started": "Not Started",
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  warning: "Warning",
  blocked: "Blocked",
  failed: "Failed",
};

const kpiIcons = [Rocket, Workflow, CalendarDays, TrendingUp, BarChart3, ShieldCheck, ShieldCheck];

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 31 - ((value - min) / Math.max(max - min, 1)) * 26;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className={styles.sparkline} viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function statusClass(status: LifecycleStatus) {
  return `${styles.statusBadge} ${styles[`status_${status.replace("-", "_")}`]}`;
}

function PageIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    chart: <LineChart size={19} />,
    structure: <Activity size={19} />,
    calendar: <CalendarDays size={19} />,
    arrow: <TrendingUp size={19} />,
    news: <CalendarDays size={19} />,
    sentiment: <Users size={19} />,
    liquidity: <Workflow size={19} />,
    levels: <BarChart3 size={19} />,
    bias: <ShieldCheck size={19} />,
    matrix: <Grid2X2 size={19} />,
    warning: <AlertTriangle size={19} />,
    history: <Activity size={19} />,
    rocket: <Rocket size={19} />,
    settings: <Workflow size={19} />,
    profile: <Users size={19} />,
    shield: <ShieldCheck size={19} />,
    checklist: <Check size={19} />,
  };

  return <span className={styles.pageIcon}>{icons[name] ?? <Activity size={19} />}</span>;
}

export default function LifecycleCommandCentreView() {
  const [snapshot, setSnapshot] = useState<LifecycleSnapshot>(lifecycleSnapshot);
  const [selectedStageKey, setSelectedStageKey] = useState(lifecycleSnapshot.currentStageKey);
  const [liveConnection, setLiveConnection] = useState<"connected" | "reconnecting">("reconnecting");
  const mounted = useRef(true);
  const userSelectedStage = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let closed = false;
    let refreshPending = false;
    let activeStream: EventSource | null = null;
    let reconnectTimer: number | undefined;
    const controller = new AbortController();

    const applySnapshot = (next: LifecycleSnapshot) => {
      if (!mounted.current) return;
      setSnapshot(next);
      setSelectedStageKey((current) => {
        if (!userSelectedStage.current) {
          return next.currentStageKey;
        }
        return next.stages.some((stage) => stage.key === current) ? current : next.currentStageKey;
      });
    };

    const refresh = async () => {
      if (refreshPending || closed) return;
      refreshPending = true;
      try {
        applySnapshot(await fetchLifecycleSnapshot(controller.signal));
      } catch {
        if (!closed) setLiveConnection("reconnecting");
      } finally {
        refreshPending = false;
      }
    };

    const connectStream = () => {
      if (closed) return;
      const stream = openLifecycleStream();
      if (!stream) return;
      activeStream?.close();
      activeStream = stream;

      stream.onopen = () => {
        if (!closed) setLiveConnection("connected");
      };
      stream.onmessage = (event) => {
        if (closed) return;
        try {
          applySnapshot(JSON.parse(event.data) as LifecycleSnapshot);
        } catch {
          // Retain the last valid autonomous lifecycle state.
        }
      };
      stream.onerror = () => {
        if (closed || activeStream !== stream) return;
        setLiveConnection("reconnecting");
        stream.close();
        activeStream = null;
        if (reconnectTimer) window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(connectStream, 3000);
      };
    };

    void refresh();
    connectStream();
    const pollTimer = window.setInterval(() => void refresh(), 5000);
    const onRuntimeUpdate = () => void refresh();
    window.addEventListener("lifecycle-runtime-updated", onRuntimeUpdate);

    return () => {
      closed = true;
      mounted.current = false;
      controller.abort();
      activeStream?.close();
      window.clearInterval(pollTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.removeEventListener("lifecycle-runtime-updated", onRuntimeUpdate);
    };
  }, []);

  const selectedStage =
    snapshot.stages.find((stage) => stage.key === selectedStageKey) ??
    snapshot.stages.find((stage) => stage.key === snapshot.currentStageKey) ??
    snapshot.stages[0];
  const currentStage =
    snapshot.stages.find((stage) => stage.key === snapshot.currentStageKey) ??
    selectedStage;

  const groups = useMemo(() => Array.from(new Set(snapshot.stages.map((stage) => stage.group))), [snapshot.stages]);

  const pageSummary = useMemo(() => {
    const pages = selectedStage.pages;
    return {
      total: pages.length,
      completed: pages.filter((page) => page.status === "completed").length,
      inProgress: pages.filter((page) => page.status === "in-progress").length,
      pending: pages.filter((page) => page.status === "pending").length,
      blocked: pages.filter((page) => page.status === "blocked").length,
      failed: pages.filter((page) => page.status === "failed").length,
    };
  }, [selectedStage]);

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <h1>Lifecycle Command Centre</h1>
          <p>End-to-end autonomous gold trading system lifecycle</p>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        {snapshot.kpis.map((kpi, index) => {
          const Icon = kpiIcons[index] ?? Activity;
          return (
            <article className={`${styles.kpiCard} ${styles[kpi.tone]}`} key={kpi.label}>
              <span className={styles.kpiIcon}><Icon size={20} /></span>
              <div>
                <small>{kpi.label}</small>
                <strong>{kpi.value}</strong>
                <p>{kpi.helper}</p>
              </div>
              <Sparkline values={kpi.trend} />
            </article>
          );
        })}
      </section>

      <section className={styles.lifecyclePanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Trading System Lifecycle <span className={styles.infoDot}>i</span></h2>
            <p>Click on any stage to view its pages and manage the workflow</p>
          </div>
        </div>

        <div className={styles.groupRow}>{groups.map((group) => <span key={group}>{group}</span>)}</div>

        <div className={styles.stageScroller}>
          <div className={styles.stageTrack}>
            {snapshot.stages.map((stage, index) => {
              const selected = stage.key === selectedStage.key;
              const completed = stage.status === "completed";
              return (
                <button
                  key={stage.key}
                  type="button"
                  className={`${styles.stageButton} ${styles[`stage_${stage.status.replace("-", "_")}`]} ${selected ? styles.stageSelected : ""}`}
                  onClick={() => {
                    userSelectedStage.current = true;
                    setSelectedStageKey(stage.key);
                  }}
                  aria-pressed={selected}
                >
                  <span className={styles.stageNumber}>{stage.id}</span>
                  <span className={`${styles.stageNode} ${styles[`node_${stage.status.replace("-", "_")}`]}`}>
                    {completed ? <Check size={14} /> : stage.key === "stop" ? <Power size={15} /> : <ShieldCheck size={14} />}
                  </span>
                  <strong>{stage.name}</strong>
                  <small>{statusLabel[stage.status]}</small>
                  {index < snapshot.stages.length - 1 && <i className={styles.connector} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.lifecycleFooter}>
          <span>
            Current Stage: <strong>{currentStage.name}</strong> - {currentStage.summary}
          </span>
          <div className={styles.progressBar}><i style={{ width: `${snapshot.progress}%` }} /></div>
          <b>{snapshot.progress}%</b>
        </div>
      </section>

      <div className={styles.workspaceGrid}>
        <main className={styles.workspace}>
          <section className={styles.stageHero}>
            <span className={styles.stageHeroIcon}><BarChart3 size={38} /></span>
            <div className={styles.stageHeroCopy}>
              <div><h2>{selectedStage.name} STAGE</h2><span className={statusClass(selectedStage.status)}>{statusLabel[selectedStage.status]}</span></div>
              <p>{selectedStage.summary}</p>
            </div>
            <div className={styles.stageMetric}><span>Started</span><strong>{selectedStage.startedAt ?? "Awaiting"}</strong></div>
            <div className={styles.stageMetric}><span>Elapsed</span><strong>{selectedStage.elapsed ?? "00:00:00"}</strong></div>
            <div className={styles.stageMetric}><span>Est. Completion</span><strong>{selectedStage.estimatedCompletion ?? "Queued"}</strong></div>
            <div className={styles.readinessRing} style={{ "--readiness": `${selectedStage.readiness ?? selectedStage.progress}%` } as CSSProperties}>
              <div><strong>{selectedStage.readiness ?? selectedStage.progress}%</strong><span>Readiness</span></div>
            </div>
            <div className={styles.agents}><span>Responsible Agents</span><strong>5 Active</strong><Users size={36} /></div>
          </section>

          <nav className={styles.tabs} aria-label="Stage workspace views">
            <button className={styles.activeTab}>Stage Pages ({selectedStage.pages.length})</button>
            <button>Activities</button>
            <button>Signals & Insights</button>
            <button>Dependencies</button>
            <button>Exceptions</button>
            <button>History</button>
            <Link href="/market-intelligence">View Stage Dashboard</Link>
          </nav>

          <section className={styles.pagesSection}>
            <div className={styles.sectionHeading}>
              <div><h3>Pages in {selectedStage.name} Stage</h3><p>Access all workspaces and tools for comprehensive market analysis</p></div>
              <div className={styles.viewControls}>
                <button className={styles.activeView} aria-label="Grid view"><Grid2X2 size={15} /></button>
                <button aria-label="List view"><List size={15} /></button>
                <label><Search size={14} /><input aria-label="Search stage pages" placeholder="Search pages..." /></label>
              </div>
            </div>

            {selectedStage.pages.length > 0 ? (
              <div className={styles.pageCards}>
                {selectedStage.pages.map((page) => (
                  <Link href={page.href} className={styles.pageCard} key={page.id}>
                    <div className={styles.pageCardTop}>
                      <PageIcon name={page.icon} />
                      <div><h4>{page.title}</h4><p>{page.description}</p></div>
                    </div>
                    <div className={styles.pageCardBottom}><span className={statusClass(page.status)}>{statusLabel[page.status]}</span><b>Open {">"}</b></div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>{selectedStage.name} stage registry is synchronizing.</strong>
                <p>Associated pages will appear automatically when published by the lifecycle registry.</p>
              </div>
            )}
          </section>

          <section className={styles.activityStrip}>
            <div><strong>Recent Stage Activity</strong><Link href="/executive/autonomous-activity-timeline">View All</Link></div>
            <div className={styles.activityItems}>
              {snapshot.activity.map((item) => (
                <article className={`${styles.activityItem} ${styles[`activity_${item.tone}`]}`} key={item.id}>
                  <Check size={12} /><small>{item.time}</small><p>{item.message}</p>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.rightRail}>
          <section className={styles.railCard}>
            <h3><BarChart3 size={18} /> Stage Summary</h3>
            <dl>
              <div><dt>Total Pages</dt><dd>{pageSummary.total}</dd></div>
              <div><dt>Completed</dt><dd>{pageSummary.completed}</dd></div>
              <div><dt>In Progress</dt><dd>{pageSummary.inProgress}</dd></div>
              <div><dt>Pending</dt><dd>{pageSummary.pending}</dd></div>
              <div><dt>Blocked</dt><dd>{pageSummary.blocked}</dd></div>
              <div><dt>Failed</dt><dd>{pageSummary.failed}</dd></div>
            </dl>
          </section>
          <section className={styles.railCard}>
            <h3><Workflow size={18} /> Key Inputs</h3>
            <ul>{selectedStage.inputs.map((input) => <li key={input}><Check size={13} />{input}</li>)}</ul>
          </section>
          <section className={styles.railCard}>
            <h3><ShieldCheck size={18} /> Stage Output</h3>
            <ul>{selectedStage.outputs.map((output) => <li key={output}><Check size={13} />{output}</li>)}</ul>
          </section>
          <section className={styles.railCard}>
            <h3><Activity size={18} /> Live Connection</h3>
            <p className={styles.connectionText}>{liveConnection === "connected" ? `Lifecycle stream connected · updated ${formatTime(snapshot.updatedAt)}` : "Using resilient 5-second snapshot sync"}</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
