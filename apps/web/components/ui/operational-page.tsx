import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Database, History, RotateCw } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { lifecycleStages } from "@/config/lifecycle";
import { getNavigationItemByRoute } from "@/config/navigation";
import { routeMetadata } from "@/config/route-metadata";
import { Breadcrumb } from "@/components/layout/breadcrumb";

export function OperationalPage({ route }: { route: string }) {
  const item = getNavigationItemByRoute(route);
  if (!item) notFound();
  const metadata = routeMetadata[item.route];
  const lifecycle = lifecycleStages[item.lifecycleStage];
  const adminDisabled = item.area === "administration" && !featureFlags.administration_enabled;

  return (
    <main className="content">
      <header className="page-header">
        <Breadcrumb item={item} />
        <h1>{item.label}</h1>
        <div className="metadata">
          <span className="pill gold">{lifecycle.label}</span>
          <span className="pill">{lifecycle.area}</span>
          <span className="pill">System state: connected service pending</span>
          <span className="pill">Last update: realtime source required</span>
          <span className="pill">Audit: {metadata.auditIdentity}</span>
        </div>
      </header>

      {adminDisabled ? (
        <section className="empty">
          <h2>Planned after system certification.</h2>
          <p>Administration, authentication, tenant isolation, and role enforcement are intentionally feature-flagged off during initial trading-system development.</p>
        </section>
      ) : null}

      <section className="grid" aria-label="Executive summary">
        <div className="section kpi"><span>Status</span><strong>Waiting</strong><p>Operational data will be loaded from {metadata.statusSource}.</p></div>
        <div className="section kpi"><span>KPI</span><strong>Live</strong><p>Production database and realtime service bindings are required.</p></div>
        <div className="section kpi"><span>Decision</span><strong>Hold</strong><p>Current decision remains empty until backend integration completes.</p></div>
        <div className="section kpi"><span>Alerts</span><strong>0</strong><p>Alert stream: {metadata.alertSource}.</p></div>
      </section>

      <section className="workspace" aria-label="Primary workspace">
        <div className="section">
          <h2>Primary Workspace</h2>
          <div className="matrix">
            <div className="cell"><strong>Operational data</strong><span>No mock records. Connect production source.</span></div>
            <div className="cell"><strong>Charts or matrices</strong><span>Realtime market visualization boundary.</span></div>
            <div className="cell"><strong>Tables</strong><span>Empty state active.</span></div>
            <div className="cell"><strong>Decision evidence</strong><span>Awaiting backend evidence payload.</span></div>
            <div className="cell"><strong>Drill-down details</strong><span>Route identity: {metadata.id}</span></div>
            <div className="cell"><strong>Permission</strong><span>{metadata.permission}</span></div>
          </div>
        </div>
        <div className="section">
          <h2>Actions</h2>
          <div className="metadata">
            <button className="search-button"><RotateCw size={16} /> Retry</button>
            <button className="search-button"><Database size={16} /> Sync</button>
            <button className="search-button"><CheckCircle2 size={16} /> Acknowledge</button>
          </div>
          <div className="empty" style={{ marginTop: 14 }}>Empty state: no production records have been returned for this workspace.</div>
          <div className="error-box" style={{ marginTop: 10 }}><AlertTriangle size={16} /> Error state and retry controls are available for service failures.</div>
        </div>
      </section>

      <section className="grid">
        <div className="section" style={{ gridColumn: "span 2" }}>
          <h2>Autonomous Activity</h2>
          <table className="table">
            <tbody>
              <tr><th>Current action</th><td>Awaiting service integration</td></tr>
              <tr><th>Latest outputs</th><td>No mock output retained</td></tr>
              <tr><th>Next expected action</th><td>Read production database or realtime stream</td></tr>
              <tr><th>Blocking condition</th><td>Backend adapter unavailable</td></tr>
            </tbody>
          </table>
        </div>
        <div className="section" style={{ gridColumn: "span 2" }}>
          <h2>Audit and History</h2>
          <ol className="timeline">
            <li><Clock size={14} /> Page opened with audit identity {metadata.auditIdentity}</li>
            <li><History size={14} /> Previous decisions, errors, and changes will render from the audit service.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
