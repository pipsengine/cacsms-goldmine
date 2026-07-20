"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Gauge,
  History,
  KeyRound,
  Link2,
  LockKeyhole,
  Network,
  RefreshCw,
  Router,
  Server,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrokerConnectivity, ConnectivitySnapshot, ConnectivitySnapshotResponse, ConnectivityStatus } from "@/types/connectivity";
import styles from "./broker-connection-page.module.css";

type StreamMode = "connecting" | "live" | "reconnecting" | "polling";

type BrokerGate = {
  id: string;
  label: string;
  detail: string;
  status: ConnectivityStatus;
  icon: typeof Activity;
};

const statusText: Record<ConnectivityStatus, string> = {
  online: "Online",
  connecting: "Connecting",
  degraded: "Degraded",
  offline: "Offline",
};

const statusIcon = {
  online: CheckCircle2,
  connecting: RefreshCw,
  degraded: AlertTriangle,
  offline: WifiOff,
} satisfies Record<ConnectivityStatus, typeof CheckCircle2>;

export function BrokerConnectionPage() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const reconnectCount = useRef(0);

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/platform-readiness/connect", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Broker connection snapshot failed with ${response.status}`);
      const payload = await response.json() as ConnectivitySnapshotResponse;
      setSnapshot(payload.snapshot);
      setLastError(null);
      return payload.snapshot;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Broker connection refresh failed");
      return null;
    }
  }, []);

  useEffect(() => {
    let closed = false;
    const source = new EventSource("/api/platform-readiness/connect/stream");

    source.addEventListener("open", () => {
      if (closed) return;
      setStreamMode("live");
      setLastError(null);
    });

    source.addEventListener("snapshot", (event) => {
      if (closed) return;
      setSnapshot(JSON.parse((event as MessageEvent).data) as ConnectivitySnapshot);
      setStreamMode("live");
    });

    source.addEventListener("error", () => {
      if (closed) return;
      reconnectCount.current += 1;
      setStreamMode(reconnectCount.current > 2 ? "polling" : "reconnecting");
      setLastError("Broker realtime stream interrupted; autonomous polling fallback is active.");
      if (!fallbackTimer.current) {
        fallbackTimer.current = window.setInterval(refreshSnapshot, 6000);
      }
    });

    void refreshSnapshot();

    return () => {
      closed = true;
      source.close();
      if (fallbackTimer.current) window.clearInterval(fallbackTimer.current);
    };
  }, [refreshSnapshot]);

  const broker = snapshot?.broker ?? emptyBroker();
  const bridgeService = snapshot?.services.find((service) => service.id === "mt5-bridge");
  const databaseService = snapshot?.services.find((service) => service.id === "database");
  const auditService = snapshot?.services.find((service) => service.id === "audit-stream");
  const lastUpdate = snapshot ? formatTime(snapshot.generatedAt) : "Loading";

  const gates = useMemo<BrokerGate[]>(() => [
    { id: "identity", label: "Broker Identity", detail: "Broker name, server, terminal, and account reference resolved.", status: broker.server === "Unconfigured" ? "offline" : broker.status, icon: Building2 },
    { id: "credentials", label: "Credential Vault", detail: "Connection credentials are expected from secure backend configuration.", status: broker.permissions.length ? broker.status : "offline", icon: KeyRound },
    { id: "account", label: "Account Session", detail: "Account binding, trade mode, and session state are monitored continuously.", status: broker.account === "Unbound" ? "offline" : broker.status, icon: CircleDollarSign },
    { id: "execution", label: "Execution Permission", detail: "Orders, positions, and account-state scopes must be available before execution.", status: broker.permissions.includes("orders") ? broker.status : "offline", icon: BadgeCheck },
    { id: "audit", label: "Audit Stream", detail: "Connection decisions and broker-state changes are published to realtime audit.", status: auditService?.status ?? "connecting", icon: FileCheck2 },
    { id: "failover", label: "Failover Guard", detail: "Primary broker link remains fail-closed until backup route evidence exists.", status: snapshot?.diagnostics.failover ?? "connecting", icon: ShieldCheck },
  ], [auditService?.status, broker.account, broker.permissions, broker.server, broker.status, snapshot?.diagnostics.failover]);

  const readyGates = gates.filter((gate) => gate.status === "online").length;
  const riskDecision = broker.status === "online" && readyGates >= 5 ? "Broker Ready" : broker.status === "offline" ? "Connection Blocked" : "Connection Held";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Platform Readiness</span>
        <ChevronRight size={13} />
        <span>Connect</span>
        <ChevronRight size={13} />
        <strong>Broker Connection</strong>
      </nav>

      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.stageNumber}>03.2</span>
            <div>
              <p>Autonomous broker onboarding</p>
              <h1>Broker Connection</h1>
            </div>
          </div>
          <div className={styles.metadata}>
            <span className={styles.primaryTag}>CONNECT.BROKER</span>
            <span>Mode: Autonomous</span>
            <span>SSE: {streamMode}</span>
            <span>Broker: {broker.brokerName}</span>
            <span>Audit: audit.platform-readiness.connect.broker-connection</span>
          </div>
        </div>
        <StatusDecision status={broker.status} decision={riskDecision} score={snapshot?.readinessScore ?? 0} />
      </header>

      <section className={styles.controlStrip}>
        <div className={styles.pulse}><i /><span><small>Broker supervisor</small><strong>{streamMode === "live" ? "Realtime broker monitor active" : "Reconnect sequence active"}</strong></span></div>
        <div className={styles.stripMetric}><small>Last update</small><strong>{lastUpdate}</strong></div>
        <div className={styles.stripMetric}><small>Correlation</small><strong>{snapshot?.correlationId ?? "Pending"}</strong></div>
        <button className={styles.iconButton} type="button" onClick={() => void refreshSnapshot()} aria-label="Refresh broker connection" title="Refresh broker connection"><RefreshCw size={17} /></button>
      </section>

      {lastError ? <div className={styles.notice}><AlertTriangle size={15} /><span>{lastError}</span></div> : null}

      <section className={styles.kpiGrid} aria-label="Broker connection status">
        <Kpi icon={Building2} tone="teal" label="Broker" value={broker.brokerName} detail={broker.server} />
        <Kpi icon={Link2} tone="blue" label="Connection" value={statusText[broker.status]} detail={bridgeService?.endpoint ?? "Broker endpoint not configured"} />
        <Kpi icon={Gauge} tone="gold" label="Ping" value={formatMs(broker.pingMs)} detail={`Spread ${broker.spreadPoints ? `${broker.spreadPoints} pts` : "unavailable"}`} />
        <Kpi icon={LockKeyhole} tone="purple" label="Gates" value={`${readyGates}/${gates.length}`} detail="Broker readiness controls online" />
      </section>

      <div className={styles.workspace}>
        <section className={styles.mainColumn}>
          <article className={styles.panel}>
            <PanelHeader icon={Server} title="Broker Session" detail="Broker identity, account binding, execution mode, and bridge health." />
            <div className={styles.sessionGrid}>
              <div className={styles.sessionCard}>
                <StatusPill status={broker.status} />
                <h2>{broker.brokerName}</h2>
                <dl>
                  <div><dt>Server</dt><dd>{broker.server}</dd></div>
                  <div><dt>Terminal</dt><dd>{broker.terminal}</dd></div>
                  <div><dt>Account</dt><dd>{broker.account}</dd></div>
                  <div><dt>Trade mode</dt><dd>{broker.tradeMode}</dd></div>
                  <div><dt>Bridge latency</dt><dd>{formatMs(bridgeService?.latencyMs ?? broker.pingMs)}</dd></div>
                  <div><dt>Database sync</dt><dd>{statusText[databaseService?.status ?? "connecting"]}</dd></div>
                </dl>
              </div>
              <div className={styles.connectionMap}>
                <h3>Connection Path</h3>
                <div className={styles.pathRail}>
                  <PathNode icon={Building2} label="Broker" status={broker.status} />
                  <PathNode icon={Router} label="Bridge" status={bridgeService?.status ?? "connecting"} />
                  <PathNode icon={Network} label="Platform" status={snapshot?.overallStatus ?? "connecting"} />
                  <PathNode icon={ShieldCheck} label="Risk Gate" status={broker.status === "online" ? "degraded" : broker.status} />
                </div>
                <p>Autonomous broker connection remains controlled by backend evidence. Missing credentials or broker endpoints hold the page in fail-closed mode.</p>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={ShieldCheck} title="Readiness Gates" detail="Broker connection checks required before the platform can trust execution routes." />
            <div className={styles.gateGrid}>
              {gates.map((gate) => <GateCard gate={gate} key={gate.id} />)}
            </div>
          </article>

          <article className={styles.panel}>
            <PanelHeader icon={KeyRound} title="Permissions and Evidence" detail="Connection scopes discovered from the broker bridge and secured backend configuration." />
            <div className={styles.permissionGrid}>
              {["prices", "positions", "orders", "account-state", "history", "margin", "trade-context", "risk-lock"].map((permission) => {
                const ready = broker.permissions.includes(permission) || permission === "risk-lock";
                return <div className={ready ? styles.permissionReady : styles.permissionBlocked} key={permission}>{ready ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}<span>{permission}</span></div>;
              })}
            </div>
          </article>
        </section>

        <aside className={styles.rightRail}>
          <article className={styles.railCard}>
            <div className={styles.scoreHeader}><h3>Broker Readiness</h3><span>{snapshot?.readinessScore ?? 0}%</span></div>
            <div className={styles.scoreRing} style={{ "--progress": `${(snapshot?.readinessScore ?? 0) * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{snapshot?.readinessScore ?? 0}%</strong><small>Ready</small></div>
            </div>
            <ul className={styles.statusList}>
              <li><span>Broker link</span><StatusPill status={broker.status} /></li>
              <li><span>Bridge service</span><StatusPill status={bridgeService?.status ?? "connecting"} /></li>
              <li><span>Audit stream</span><StatusPill status={auditService?.status ?? "connecting"} /></li>
              <li><span>Failover</span><StatusPill status={snapshot?.diagnostics.failover ?? "connecting"} /></li>
            </ul>
          </article>

          <article className={styles.railCard}>
            <PanelHeader compact icon={Clock3} title="Autonomous Actions" detail="Current broker loop" />
            <div className={styles.timeline}>
              <div><i /><p>Read broker connectivity snapshot</p><time>{lastUpdate}</time></div>
              <div><i /><p>Validate credential and account evidence</p><time>Auto</time></div>
              <div><i /><p>Check execution scopes and failover</p><time>Auto</time></div>
              <div><i /><p>Publish broker connection decision</p><time>Live</time></div>
            </div>
          </article>

          <article className={styles.railCard}>
            <PanelHeader compact icon={History} title="Broker Logs" detail="Newest events" />
            <div className={styles.logList}>
              {(snapshot?.logs ?? []).map((log) => (
                <div className={styles.logItem} key={log.id}>
                  <time>{formatTime(log.timestamp)}</time>
                  <strong>{log.source}</strong>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, tone, label, value, detail }: { icon: typeof Activity; tone: string; label: string; value: string; detail: string }) {
  return <article className={styles.kpi}><span className={`${styles.kpiIcon} ${styles[tone]}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

function PanelHeader({ icon: Icon, title, detail, compact = false }: { icon: typeof Activity; title: string; detail: string; compact?: boolean }) {
  return <header className={compact ? styles.compactHeader : styles.panelHeader}><span><Icon size={compact ? 16 : 19} /></span><div><h2>{title}</h2><p>{detail}</p></div></header>;
}

function GateCard({ gate }: { gate: BrokerGate }) {
  const Icon = gate.icon;
  return <article className={`${styles.gateCard} ${styles[gate.status]}`}><div className={styles.gateTop}><span><Icon size={18} /></span><StatusPill status={gate.status} /></div><strong>{gate.label}</strong><p>{gate.detail}</p></article>;
}

function PathNode({ icon: Icon, label, status }: { icon: typeof Activity; label: string; status: ConnectivityStatus }) {
  return <div className={`${styles.pathNode} ${styles[status]}`}><Icon size={18} /><span>{label}</span><StatusPill status={status} /></div>;
}

function StatusDecision({ status, decision, score }: { status: ConnectivityStatus; decision: string; score: number }) {
  const Icon = statusIcon[status];
  return <div className={`${styles.decision} ${styles[status]}`}><small>Broker Decision</small><strong><Icon className={status === "connecting" ? styles.spin : undefined} size={15} />{decision}</strong><span>{score}% connectivity readiness</span></div>;
}

function StatusPill({ status }: { status: ConnectivityStatus }) {
  const Icon = statusIcon[status];
  return <span className={`${styles.statusPill} ${styles[status]}`}><Icon className={status === "connecting" ? styles.spin : undefined} size={13} />{statusText[status]}</span>;
}

function emptyBroker(): BrokerConnectivity {
  return {
    status: "connecting",
    brokerName: "Primary Gold Broker",
    terminal: "MT5 Terminal",
    account: "Binding",
    server: "Resolving",
    tradeMode: "unconfigured",
    pingMs: null,
    spreadPoints: null,
    permissions: [],
  };
}

function formatMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value} ms` : "n/a";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
