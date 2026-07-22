import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
const SUCCESS_CACHE_MS = 5000;
const ERROR_CACHE_MS = 5000;
const MAX_TERMINALS = 6;

type ProbeResult = {
  terminalName: string | null;
  brokerName: string | null;
  server: string | null;
  accountLogin: string | null;
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

export function invalidateMt5TerminalCatalog() {
  cache.value = [];
  cache.expiresAt = 0;
  cache.pending = null;
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
    const accountOptions = buildAccountOptions(terminalPath, probe?.accountLogin ?? null, savedProfiles.profiles);

    return {
      terminalId: getMt5TerminalId(terminalPath),
      terminalName,
      terminalPath,
      brokerName,
      detectedServer: probe?.server ?? null,
      serverOptions,
      accountOptions,
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
      accountLogin?: string | null;
    };

    return {
      terminalName: payload.terminalName ?? null,
      brokerName: payload.brokerName ?? null,
      server: payload.server ?? null,
      accountLogin: payload.accountLogin ?? null,
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

function buildAccountOptions(
  terminalPath: string,
  detectedLogin: string | null,
  savedProfiles: Array<{ terminalPath: string | null; login: string | null }>,
) {
  const options = new Set<string>();

  if (detectedLogin && /^\d+$/.test(detectedLogin)) options.add(detectedLogin);

  for (const login of discoverTerminalAccountLogins(terminalPath)) {
    options.add(login);
  }

  for (const profile of savedProfiles) {
    if (profile.terminalPath === terminalPath && profile.login && /^\d+$/.test(profile.login)) {
      options.add(profile.login);
    }
  }

  return Array.from(options);
}

function discoverTerminalAccountLogins(terminalPath: string) {
  const dataRoot = findTerminalDataRoot(terminalPath);
  if (!dataRoot) return [];

  const options = new Set<string>();
  const logsDirectory = path.join(dataRoot, "logs");
  const logFiles = safeFiles(logsDirectory, ".log")
    .sort((a, b) => safeMtime(b) - safeMtime(a))
    .slice(0, 10);

  for (const filePath of logFiles) {
    for (const login of extractAccountLogins(readTextFile(filePath))) {
      options.add(login);
    }
  }

  return Array.from(options);
}

function findTerminalDataRoot(terminalPath: string) {
  const normalizedTerminalPath = normalizePath(terminalPath);
  const normalizedTerminalDirectory = normalizePath(path.dirname(terminalPath));
  for (const root of metaQuotesTerminalRoots()) {
    for (const child of safeDirectoryPaths(root)) {
      const originPath = path.join(child, "origin.txt");
      if (!existsSync(originPath)) continue;
      const origin = readDecodedFile(originPath).replace(/^\uFEFF/, "").trim();
      const normalizedOrigin = normalizePath(origin);
      if (normalizedOrigin === normalizedTerminalPath || normalizedOrigin === normalizedTerminalDirectory) return child;
    }
  }
  return null;
}

function metaQuotesTerminalRoots() {
  return [process.env.APPDATA, process.env.LOCALAPPDATA]
    .filter(Boolean)
    .map((root) => path.join(root as string, "MetaQuotes", "Terminal"))
    .filter((root) => existsSync(root));
}

function safeDirectoryPaths(directoryPath: string) {
  try {
    return readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directoryPath, entry.name));
  } catch {
    return [];
  }
}

function safeFiles(directoryPath: string, extension: string) {
  try {
    return readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
      .map((entry) => path.join(directoryPath, entry.name));
  } catch {
    return [];
  }
}

function safeMtime(filePath: string) {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function readTextFile(filePath: string) {
  try {
    const buffer = readFileSync(filePath);
    const utf16 = buffer.toString("utf16le");
    const utf8 = buffer.toString("utf8");
    return `${utf8}\n${utf16}`;
  } catch {
    return "";
  }
}

function readDecodedFile(filePath: string) {
  try {
    const buffer = readFileSync(filePath);
    const utf8 = buffer.toString("utf8");
    const utf16 = buffer.toString("utf16le");
    const nulCount = (utf8.match(/\u0000/g) ?? []).length;
    return nulCount > utf8.length / 8 ? utf16 : utf8;
  } catch {
    return "";
  }
}

function extractAccountLogins(text: string) {
  const options = new Set<string>();
  for (const match of text.matchAll(/'(\d{5,12})':\s+(?:authorized|terminal synchronized|trading has been enabled|connection to|disconnected from)/gi)) {
    options.add(match[1]);
  }
  return Array.from(options);
}

function normalizePath(value: string) {
  return path.normalize(value).replace(/[\\\/]+$/, "").toLowerCase();
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
