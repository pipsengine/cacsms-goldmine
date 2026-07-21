import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { detectMt5TerminalCandidates, getMt5TerminalId } from "@/lib/server/mt5-local-bridge";
import { listMt5SessionProfiles } from "@/lib/server/mt5-session-store";
import type { Mt5TerminalCatalogItem } from "@/types/connectivity";

const execFileAsync = promisify(execFile);
const PYTHON_LAUNCHER = process.env.MT5_PYTHON_LAUNCHER ?? "py";
const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = path.resolve(path.dirname(currentFilePath), "..", "..", "scripts", "mt5-terminal-probe.py");
const SUCCESS_CACHE_MS = 30000;
const ERROR_CACHE_MS = 15000;
const MAX_TERMINALS = 6;

type ProbeResult = {
  terminalName: string | null;
  brokerName: string | null;
  server: string | null;
};

type CacheState = {
  value: Mt5TerminalCatalogItem[];
  expiresAt: number;
  pending: Promise<Mt5TerminalCatalogItem[]> | null;
};

const globalCatalogCache = globalThis as typeof globalThis & {
  __mt5TerminalCatalogCache?: CacheState;
};

const cache =
  globalCatalogCache.__mt5TerminalCatalogCache ??
  {
    value: [],
    expiresAt: 0,
    pending: null,
  };

globalCatalogCache.__mt5TerminalCatalogCache = cache;

export async function getMt5TerminalCatalog() {
  const now = Date.now();
  if (cache.value.length && cache.expiresAt > now) return cache.value;
  if (cache.pending) return cache.pending;

  cache.pending = loadCatalog();

  try {
    const result = await cache.pending;
    cache.value = result;
    cache.expiresAt = Date.now() + (result.length ? SUCCESS_CACHE_MS : ERROR_CACHE_MS);
    return result;
  } finally {
    cache.pending = null;
  }
}

async function loadCatalog() {
  const candidates = detectMt5TerminalCandidates().slice(0, MAX_TERMINALS);
  const savedProfiles = await listMt5SessionProfiles();

  const probeResults = await Promise.all(candidates.map((candidate) => probeTerminalMetadata(candidate)));

  return candidates.map<Mt5TerminalCatalogItem>((terminalPath, index) => {
    const probe = probeResults[index];
    const terminalName = probe?.terminalName ?? inferTerminalName(terminalPath);
    const brokerName = probe?.brokerName ?? inferBrokerName(terminalName);
    const serverOptions = buildServerOptions(terminalPath, terminalName, probe?.server ?? null, savedProfiles.profiles);

    return {
      terminalId: getMt5TerminalId(terminalPath),
      terminalName,
      terminalPath,
      brokerName,
      detectedServer: probe?.server ?? null,
      serverOptions,
    };
  });
}

async function probeTerminalMetadata(terminalPath: string): Promise<ProbeResult | null> {
  try {
    const { stdout } = await execFileAsync(PYTHON_LAUNCHER, [scriptPath, "--symbol", "XAUUSD", "--terminal-path", terminalPath], {
      cwd: process.cwd(),
      timeout: 1200,
      maxBuffer: 512 * 1024,
      windowsHide: true,
    });

    const lastLine = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);

    if (!lastLine) return null;
    const payload = JSON.parse(lastLine) as {
      terminalName?: string | null;
      brokerName?: string | null;
      server?: string | null;
    };

    return {
      terminalName: payload.terminalName ?? null,
      brokerName: payload.brokerName ?? null,
      server: payload.server ?? null,
    };
  } catch {
    return null;
  }
}

function buildServerOptions(
  terminalPath: string,
  terminalName: string,
  detectedServer: string | null,
  savedProfiles: Array<{ terminalPath: string | null; server: string | null }>,
) {
  const options = new Set<string>();

  if (detectedServer) options.add(detectedServer);

  for (const profile of savedProfiles) {
    if (profile.terminalPath === terminalPath && profile.server) {
      options.add(profile.server);
    }
  }

  for (const hint of inferServerHints(terminalName, terminalPath)) {
    options.add(hint);
  }

  return Array.from(options);
}

function inferTerminalName(terminalPath: string) {
  return path.basename(path.dirname(terminalPath));
}

function inferBrokerName(terminalName: string) {
  const normalized = terminalName.toLowerCase();
  if (normalized.includes("ic markets")) return "IC Markets";
  if (normalized.includes("hfm") || normalized.includes("hfm ")) return "HFM";
  if (normalized.includes("ftmo")) return "FTMO";
  if (normalized.includes("funder")) return "Prop Firm";
  return terminalName;
}

function inferServerHints(terminalName: string, terminalPath: string) {
  const normalized = `${terminalName} ${terminalPath}`.toLowerCase();

  if (normalized.includes("ic markets")) {
    return ["ICMarketsSC-Demo", "ICMarketsSC-Live", "ICMarketsSC-Live02"];
  }

  if (normalized.includes("hfm")) {
    return ["HFMarketsGlobal-Demo", "HFMarketsGlobal-Live"];
  }

  if (normalized.includes("ftmo")) {
    return ["FTMO-Demo", "FTMO-Server"];
  }

  if (normalized.includes("prop")) {
    return ["PropFirm-Demo", "PropFirm-Live"];
  }

  return [];
}
