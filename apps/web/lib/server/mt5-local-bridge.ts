import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { getActiveMt5SessionProfile } from "@/lib/server/mt5-session-store";

const execFileAsync = promisify(execFile);
const SYMBOL = process.env.GOLD_SYMBOL ?? "XAUUSD";
const PYTHON_LAUNCHER = process.env.MT5_PYTHON_LAUNCHER ?? "py";
const SCRIPT_TIMEOUT_MS = 1000;
const SUCCESS_CACHE_MS = 1000;
const ERROR_CACHE_MS = 1500;
const MAX_AUTO_DETECTED_PROBES = 2;
const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = path.resolve(path.dirname(currentFilePath), "..", "..", "scripts", "mt5-terminal-probe.py");

export type Mt5LocalBridgeSnapshot = {
  ok: boolean;
  source: "mt5-local-python";
  terminalDetected: boolean;
  terminalConnected: boolean;
  accountConnected: boolean;
  symbol: string;
  symbolSelected: boolean;
  terminalPath: string | null;
  terminalName: string | null;
  detectedTerminalPaths: string[];
  brokerName: string | null;
  server: string | null;
  accountLogin: string | null;
  tradeMode: "live" | "demo" | "read-only" | "unconfigured";
  pingMs: number | null;
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  marginLevel: number | null;
  currency: string | null;
  leverage: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  lastTickAt: string | null;
  ticksPerMinute: number | null;
  positionsTotal: number | null;
  ordersTotal: number | null;
  permissions: string[];
  error: string | null;
};

type CacheState = {
  value: Mt5LocalBridgeSnapshot | null;
  expiresAt: number;
  pending: Promise<Mt5LocalBridgeSnapshot | null> | null;
};

const globalBridgeCache = globalThis as typeof globalThis & {
  __mt5LocalBridgeCache?: CacheState;
};

const cache =
  globalBridgeCache.__mt5LocalBridgeCache ??
  {
    value: null,
    expiresAt: 0,
    pending: null,
  };

globalBridgeCache.__mt5LocalBridgeCache = cache;

export async function getMt5LocalBridgeSnapshot() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;
  if (cache.value) {
    if (!cache.pending) {
      cache.pending = loadMt5LocalBridgeSnapshot()
        .then((result) => {
          cache.value = result;
          cache.expiresAt = Date.now() + (result?.ok ? SUCCESS_CACHE_MS : ERROR_CACHE_MS);
          return result;
        })
        .finally(() => {
          cache.pending = null;
        });
    }
    return cache.value;
  }
  if (cache.pending) return cache.pending;

  cache.pending = loadMt5LocalBridgeSnapshot();

  try {
    const result = await cache.pending;
    cache.value = result;
    cache.expiresAt = Date.now() + (result?.ok ? SUCCESS_CACHE_MS : ERROR_CACHE_MS);
    return result;
  } finally {
    cache.pending = null;
  }
}

export function getCachedMt5LocalBridgeSnapshot() {
  return cache.value;
}

export function invalidateMt5LocalBridgeCache() {
  cache.value = null;
  cache.expiresAt = 0;
  cache.pending = null;
}

export function getMt5TerminalId(terminalPath: string) {
  return `terminal-${createHash("sha1").update(path.normalize(terminalPath).toLowerCase()).digest("hex").slice(0, 12)}`;
}

async function loadMt5LocalBridgeSnapshot(): Promise<Mt5LocalBridgeSnapshot | null> {
  const activeProfile = await getActiveMt5SessionProfile();
  const terminalCandidates = Array.from(new Set([
    ...(activeProfile?.terminalPath ? [activeProfile.terminalPath] : []),
    ...(process.env.MT5_TERMINAL_PATH ? [process.env.MT5_TERMINAL_PATH] : []),
    ...detectMt5TerminalCandidates().slice(0, MAX_AUTO_DETECTED_PROBES),
  ]));

  if (!terminalCandidates.length) {
    return bridgeError("No local MT5 terminal executable was detected. Set MT5_TERMINAL_PATH to a terminal64.exe path.");
  }

  let lastFailure: Mt5LocalBridgeSnapshot | null = null;

  for (const terminalPath of terminalCandidates) {
    const result = await runProbe(terminalPath, activeProfile);
    if (result?.ok) return result;
    lastFailure = result;
  }

  return lastFailure ?? bridgeError("Local MT5 bridge probe failed.");
}

async function runProbe(
  terminalPath: string,
  activeProfile: Awaited<ReturnType<typeof getActiveMt5SessionProfile>>,
) {
  const args = [scriptPath, "--symbol", SYMBOL, "--terminal-path", terminalPath];

  const login = activeProfile?.login ?? process.env.MT5_LOGIN;
  const password = activeProfile?.password || process.env.MT5_PASSWORD;
  const server = activeProfile?.server ?? process.env.MT5_SERVER;

  if (login) args.push("--login", login);
  if (server) args.push("--server", server);

  try {
    const { stdout } = await execFileAsync(PYTHON_LAUNCHER, args, {
      cwd: process.cwd(),
      env: password ? { ...process.env, MT5_PROBE_PASSWORD: password } : process.env,
      timeout: SCRIPT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });

    const lastLine = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);

    if (!lastLine) return bridgeError("Local MT5 probe returned no data.");
    return JSON.parse(lastLine) as Mt5LocalBridgeSnapshot;
  } catch (error) {
    const commandError = error as Error & { signal?: string; killed?: boolean; stderr?: string };
    const detail = commandError.stderr?.trim();
    const timedOut = commandError.killed && commandError.signal === "SIGTERM";
    return bridgeError(
      [timedOut ? `Local MT5 probe timed out after ${SCRIPT_TIMEOUT_MS}ms.` : commandError.message || "Local MT5 bridge probe failed.", detail]
        .filter(Boolean)
        .join(" "),
    );
  }
}

export function detectMt5TerminalCandidates() {
  const candidates = new Set<string>();

  for (const root of [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"]]) {
    if (!root || !existsSync(root)) continue;
    for (const directChild of safeDirectoryNames(root)) {
      pushTerminalCandidate(candidates, path.join(root, directChild, "terminal64.exe"));
      for (const nestedChild of safeDirectoryNames(path.join(root, directChild))) {
        pushTerminalCandidate(candidates, path.join(root, directChild, nestedChild, "terminal64.exe"));
      }
    }
  }

  const localPrograms = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs") : null;
  if (localPrograms && existsSync(localPrograms)) {
    for (const directChild of safeDirectoryNames(localPrograms)) {
      pushTerminalCandidate(candidates, path.join(localPrograms, directChild, "terminal64.exe"));
      for (const nestedChild of safeDirectoryNames(path.join(localPrograms, directChild))) {
        pushTerminalCandidate(candidates, path.join(localPrograms, directChild, nestedChild, "terminal64.exe"));
      }
    }
  }

  const metaQuotesRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "MetaQuotes", "Terminal") : null;
  if (metaQuotesRoot && existsSync(metaQuotesRoot)) {
    for (const directChild of safeDirectoryNames(metaQuotesRoot)) {
      pushTerminalCandidate(candidates, path.join(metaQuotesRoot, directChild, "terminal64.exe"));
    }
  }

  return Array.from(candidates);
}

function safeDirectoryNames(directoryPath: string) {
  try {
    return readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function pushTerminalCandidate(store: Set<string>, candidatePath: string) {
  if (existsSync(candidatePath)) {
    store.add(candidatePath);
  }
}

function bridgeError(message: string): Mt5LocalBridgeSnapshot {
  return {
    ok: false,
    source: "mt5-local-python",
    terminalDetected: false,
    terminalConnected: false,
    accountConnected: false,
    symbol: SYMBOL,
    symbolSelected: false,
    terminalPath: null,
    terminalName: null,
    detectedTerminalPaths: [],
    brokerName: null,
    server: null,
    accountLogin: null,
    tradeMode: "unconfigured",
    pingMs: null,
    balance: null,
    equity: null,
    margin: null,
    freeMargin: null,
    marginLevel: null,
    currency: null,
    leverage: null,
    bid: null,
    ask: null,
    spread: null,
    lastTickAt: null,
    ticksPerMinute: null,
    positionsTotal: null,
    ordersTotal: null,
    permissions: [],
    error: message,
  };
}
