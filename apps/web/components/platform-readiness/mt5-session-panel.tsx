"use client";

import { AlertTriangle, CheckCircle2, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ConnectivityDebugResponse,
  Mt5SessionMutationResponse,
  Mt5SessionProfileCreate,
  Mt5SessionProfileSummary,
} from "@/types/connectivity";
import styles from "./mt5-session-panel.module.css";

const REQUEST_TIMEOUT_MS = 45000;

const initialForm: Mt5SessionProfileCreate = {
  tenantId: "",
  userId: "",
  terminalId: "",
  label: "",
  terminalPath: null,
  login: "",
  password: "",
  server: "",
  accountType: "Demo",
  activate: true,
};

export function Mt5SessionPanel({
  title = "Tenant Session Registry",
  description = "Select the active tenant-terminal profile or add a new broker session.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const [debugData, setDebugData] = useState<ConnectivityDebugResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<Mt5SessionProfileCreate>(initialForm);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithTimeout("/api/platform-readiness/connect/debug", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`MT5 session panel failed with ${response.status}`);
      const payload = (await response.json()) as ConnectivityDebugResponse;
      setDebugData(payload);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Unable to load MT5 sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitProfile() {
    setSubmitting(true);
    setFormError(null);

    try {
      if (!selectedTerminalPath || !generatedTerminalId || !formState.server) {
        throw new Error("Select a terminal and broker server before saving the session.");
      }

      const response = await fetchWithTimeout("/api/platform-readiness/connect/mt5-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...formState,
          tenantId: generatedTenantId,
          userId: generatedUserId,
          terminalId: generatedTerminalId,
          terminalPath: selectedTerminalPath,
          login: formState.login || null,
          server: formState.server || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Save failed with ${response.status}`);
      }

      const payload = (await response.json()) as Mt5SessionMutationResponse;
      setDebugData((current) =>
        current
          ? { ...current, sessions: payload.profiles, activeSessionId: payload.activeSessionId, storageMode: payload.storageMode }
          : current,
      );
      setModalOpen(false);
      setFormState(initialForm);
      void refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save MT5 session");
    } finally {
      setSubmitting(false);
    }
  }

  async function activateProfile(profileId: string) {
    try {
      const response = await fetchWithTimeout("/api/platform-readiness/connect/mt5-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) throw new Error(`Activation failed with ${response.status}`);

      const payload = (await response.json()) as Mt5SessionMutationResponse;
      setDebugData((current) =>
        current
          ? { ...current, sessions: payload.profiles, activeSessionId: payload.activeSessionId, storageMode: payload.storageMode }
          : current,
      );
      void refresh();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Unable to activate MT5 session");
    }
  }

  const profiles = debugData?.sessions ?? [];
  const activeSessionId = debugData?.activeSessionId ?? null;
  const detectedTerminals = debugData?.terminals ?? [];
  const selectedTerminalPath = formState.terminalPath ?? detectedTerminals[0]?.terminalPath ?? null;
  const selectedTerminal = detectedTerminals.find((terminal) => terminal.terminalPath === selectedTerminalPath) ?? null;
  const generatedTerminalId = selectedTerminal?.terminalId ?? "";
  const generatedUserId = generatedTerminalId;
  const generatedTenantId = generatedTerminalId ? `tenant-${formState.accountType.toLowerCase().replace(/\s+/g, "-")}-${generatedTerminalId}` : "";
  const availableServers = useMemo(
    () => (selectedTerminal ? selectedTerminal.serverOptions : []),
    [selectedTerminal],
  );

  useEffect(() => {
    if (!modalOpen) return;
    if (!formState.terminalPath && detectedTerminals[0]?.terminalPath) {
      setFormState((current) => ({
        ...current,
        terminalPath: detectedTerminals[0].terminalPath,
        server: detectedTerminals[0].serverOptions[0] ?? "",
      }));
    }
  }, [detectedTerminals, formState.terminalPath, modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    setFormState((current) => ({
      ...current,
      terminalId: generatedTerminalId,
      userId: generatedUserId,
      tenantId: generatedTenantId,
      server: availableServers.includes(current.server ?? "") ? current.server : availableServers[0] ?? "",
    }));
  }, [availableServers, generatedTerminalId, generatedTenantId, generatedUserId, modalOpen]);

  return (
    <section className={`${styles.panel} ${compact ? styles.compact : ""}`}>
      <header className={styles.header}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconButton} type="button" onClick={() => void refresh()} aria-label="Refresh MT5 sessions" title="Refresh MT5 sessions">
            <RefreshCw size={15} className={loading ? styles.spin : undefined} />
          </button>
          <button className={styles.primaryButton} type="button" onClick={() => setModalOpen(true)}>
            <Plus size={14} />
            Add Session
          </button>
        </div>
      </header>

      <div className={styles.metaRow}>
        <span>Storage: {debugData?.storageMode ?? "loading"}</span>
        <span>Profiles: {profiles.length}</span>
        <span>Detected terminals: {detectedTerminals.length}</span>
      </div>

      {lastError ? <div className={styles.notice}><AlertTriangle size={14} /><span>{lastError}</span></div> : null}

      <div className={styles.profileList}>
        {profiles.length ? profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            active={profile.id === activeSessionId}
            onActivate={() => void activateProfile(profile.id)}
          />
        )) : <div className={styles.emptyCard}>No saved tenant-terminal profiles yet. Auto-detection remains available.</div>}
      </div>

      <div className={styles.detectedList}>
        <strong>Detected Local Terminals</strong>
        {detectedTerminals.length ? detectedTerminals.map((terminal) => (
          <div className={styles.detectedCard} key={terminal.terminalId}>
            <strong>{terminal.terminalName}</strong>
            <span>{terminal.brokerName ?? "Broker pending"}</span>
            <code>{terminal.terminalPath}</code>
          </div>
        )) : <div className={styles.detectedItem}>No local terminals detected</div>}
      </div>

      {modalOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => !submitting && setModalOpen(false)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Add MT5 tenant session" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h4>Add Tenant Session</h4>
                <p>Broker password is submitted to the backend and persisted encrypted in MSSQL when the database is available.</p>
              </div>
              <button className={styles.closeButton} type="button" onClick={() => !submitting && setModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <label>
                <span>Tenant ID</span>
                <input value={generatedTenantId} readOnly placeholder="Auto-generated from terminal and account type" />
              </label>
              <label>
                <span>User ID / Terminal ID</span>
                <input value={generatedUserId} readOnly placeholder="Auto-generated terminal ID" />
              </label>
              <label>
                <span>Profile Label</span>
                <input value={formState.label} onChange={(event) => setFormState((current) => ({ ...current, label: event.target.value }))} placeholder="IC Markets Demo" />
              </label>
              <label>
                <span>Terminal Path</span>
                <select
                  value={selectedTerminalPath ?? ""}
                  onChange={(event) => setFormState((current) => ({ ...current, terminalPath: event.target.value || null }))}
                >
                  <option value="">Use auto-detected terminal</option>
                  {detectedTerminals.map((terminal) => (
                    <option key={terminal.terminalId} value={terminal.terminalPath}>
                      {terminal.terminalName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Type of Account</span>
                <select value={formState.accountType} onChange={(event) => setFormState((current) => ({ ...current, accountType: event.target.value as Mt5SessionProfileCreate["accountType"] }))}>
                  <option value="Demo">Demo</option>
                  <option value="Live">Live</option>
                  <option value="Prop Firm">Prop Firm</option>
                </select>
              </label>
              <label>
                <span>Account Login</span>
                <input value={formState.login ?? ""} onChange={(event) => setFormState((current) => ({ ...current, login: event.target.value }))} placeholder="52877052" />
              </label>
              <label>
                <span>Broker Server</span>
                <select value={formState.server ?? ""} onChange={(event) => setFormState((current) => ({ ...current, server: event.target.value }))}>
                  <option value="">{selectedTerminal ? "Select broker server" : "Select terminal first"}</option>
                  {availableServers.map((serverOption) => (
                    <option key={serverOption} value={serverOption}>
                      {serverOption}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fullWidth}>
                <span>Password</span>
                <input type="password" value={formState.password} onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))} placeholder="Broker password" />
              </label>
            </div>

            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={formState.activate} onChange={(event) => setFormState((current) => ({ ...current, activate: event.target.checked }))} />
              <span>Make this the active profile after save</span>
            </label>

            {formError ? <div className={styles.notice}><AlertTriangle size={14} /><span>{formError}</span></div> : null}

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} type="button" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className={styles.primaryButton} type="button" onClick={() => void submitProfile()} disabled={submitting}>
                {submitting ? "Saving" : "Save Session"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The MT5 session request timed out. Check the database connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function ProfileRow({
  profile,
  active,
  onActivate,
}: {
  profile: Mt5SessionProfileSummary;
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <article className={`${styles.profileCard} ${active ? styles.profileActive : ""}`}>
      <div className={styles.profileTop}>
        <div>
          <small>{profile.tenantId} / {profile.userId}</small>
          <strong>{profile.label}</strong>
        </div>
        <button className={active ? styles.activeBadge : styles.activateButton} type="button" onClick={onActivate} disabled={active}>
          {active ? <><CheckCircle2 size={13} />Active</> : <><ShieldCheck size={13} />Activate</>}
        </button>
      </div>
      <dl>
        <div><dt>Account type</dt><dd>{profile.accountType}</dd></div>
        <div><dt>Login</dt><dd>{profile.login ?? "Pending"}</dd></div>
        <div><dt>Server</dt><dd>{profile.server ?? "Pending"}</dd></div>
        <div><dt>Password</dt><dd>{profile.hasPassword ? "Encrypted" : "Missing"}</dd></div>
      </dl>
      <code>{profile.terminalPath ?? "Auto-detect local terminal"}</code>
    </article>
  );
}
