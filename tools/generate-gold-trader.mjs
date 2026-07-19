import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const specPath =
  "C:/Users/Cacsms Limited/.codex/attachments/66e81446-b155-4a0d-8d45-d4d215f32166/pasted-text.txt";
const spec = fs.readFileSync(specPath, "utf8");

const topAreaRoutes = new Map([
  ["Executive Command Centre", "executive"],
  ["Platform Readiness", "platform-readiness"],
  ["Gold Market Intelligence", "market-intelligence"],
  ["Trading Strategy and Opportunity", "strategy-opportunity"],
  ["Risk, Authorization and Execution", "risk-execution"],
  ["Position and Trade Operations", "trade-operations"],
  ["Performance, Learning and Control", "performance-control"],
  ["Platform Administration", "administration"],
]);

const areaIcons = new Map([
  ["executive", "LayoutDashboard"],
  ["platform-readiness", "Power"],
  ["market-intelligence", "ChartCandlestick"],
  ["strategy-opportunity", "Radar"],
  ["risk-execution", "ShieldCheck"],
  ["trade-operations", "Activity"],
  ["performance-control", "GraduationCap"],
  ["administration", "Settings"],
]);

const stageNames = new Set([
  "start",
  "initialize",
  "connect",
  "validate",
  "synchronize",
  "plan",
  "scan",
  "qualify",
  "authorize",
  "execute",
  "manage",
  "close",
  "review",
  "learn",
  "repeat",
  "stop",
]);

const apiRoutes = [
  "health",
  "lifecycle",
  "market-data",
  "analysis",
  "opportunities",
  "risk",
  "execution",
  "positions",
  "reviews",
  "administration",
];

function mkdir(filePath) {
  fs.mkdirSync(filePath, { recursive: true });
}

function write(filePath, content) {
  mkdir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function touch(filePath, content = "") {
  if (!fs.existsSync(filePath)) {
    write(filePath, content);
  }
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u2013\u2014]/g, " ")
    .replace(/&/g, " and ")
    .replace(/\//g, " ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function dotify(value) {
  return slugify(value).replaceAll("-", ".");
}

function titleToDescription(label, areaLabel) {
  return `${label} workspace for ${areaLabel}, with lifecycle state, decision evidence, audit history, and operational controls.`;
}

function extractTreeLines() {
  const start = spec.indexOf("# 2. Complete Sidebar Structure");
  const blockStart = spec.indexOf("```text", start);
  const blockEnd = spec.indexOf("```", blockStart + 7);
  return spec
    .slice(blockStart, blockEnd)
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.includes("```text") && line.trim() !== "Gold Trader" && line.trim() !== "│");
}

function parseTree() {
  const stack = [];
  const roots = [];
  for (const line of extractTreeLines()) {
    const markerIndex = Math.max(line.lastIndexOf("├──"), line.lastIndexOf("└──"));
    if (markerIndex < 0) continue;
    const depth = Math.floor(markerIndex / 4);
    const rawLabel = line
      .slice(markerIndex + 3)
      .trim()
      .replace(/^\d+\.\s+/, "");
    const node = { label: rawLabel, children: [] };
    if (depth === 0) {
      roots.push(node);
    } else {
      stack[depth - 1].children.push(node);
    }
    stack[depth] = node;
    stack.length = depth + 1;
  }
  return roots;
}

function lifecycleFor(areaSlug, ancestors, label) {
  const slugs = [...ancestors, label].map(slugify);
  const foundStage = slugs.find((slug) => stageNames.has(slug));
  if (foundStage) return foundStage;
  if (areaSlug === "market-intelligence") return "analyse";
  if (areaSlug === "platform-readiness") return "start";
  if (areaSlug === "strategy-opportunity") return "plan";
  if (areaSlug === "risk-execution") return "authorize";
  if (areaSlug === "trade-operations") return "manage";
  if (areaSlug === "performance-control") return "review";
  if (areaSlug === "executive") return "monitor";
  return "governance";
}

function flattenNavigation(tree) {
  const items = [];
  for (const areaNode of tree) {
    const areaSlug = topAreaRoutes.get(areaNode.label) ?? slugify(areaNode.label);
    const areaId = areaSlug;
    const areaRoute = `/${areaSlug}`;
    const areaItem = {
      id: areaId,
      label: areaNode.label,
      description: `${areaNode.label} parent dashboard and navigation area.`,
      route: areaRoute,
      icon: areaIcons.get(areaSlug) ?? "Circle",
      parentId: null,
      lifecycleStage: lifecycleFor(areaSlug, [], areaNode.label),
      area: areaSlug,
      order: items.length + 1,
      permission: `${dotify(areaSlug)}.dashboard.view`,
      featureFlag: areaSlug === "administration" ? "administration_enabled" : "trading_system_enabled",
      statusSource: `${areaSlug}.status`,
      alertSource: `${areaSlug}.alerts`,
      disabled: false,
      administrationPhase: areaSlug === "administration" ? "after-certification" : "initial-development",
      searchKeywords: [areaNode.label, areaSlug, "dashboard"],
      level: 0,
    };
    items.push(areaItem);

    const walk = (node, ancestors, parentId, index) => {
      const segment = slugify(node.label);
      const routeSegments = [areaSlug, ...ancestors.map(slugify), segment];
      const id = [areaSlug, ...ancestors.map(slugify), segment].join(".");
      const item = {
        id,
        label: node.label,
        description: titleToDescription(node.label, areaNode.label),
        route: `/${routeSegments.join("/")}`,
        icon: node.children.length ? "Folder" : "FileText",
        parentId,
        lifecycleStage: lifecycleFor(areaSlug, ancestors, node.label),
        area: areaSlug,
        order: index + 1,
        permission: `${dotify(areaSlug)}.${dotify([...ancestors, node.label].join("."))}.view`,
        featureFlag: areaSlug === "administration" ? "administration_enabled" : "trading_system_enabled",
        statusSource: `${areaSlug}.${[...ancestors, node.label].map(slugify).join(".")}.status`,
        alertSource: `${areaSlug}.${[...ancestors, node.label].map(slugify).join(".")}.alerts`,
        disabled: false,
        administrationPhase: areaSlug === "administration" ? "after-certification" : "initial-development",
        searchKeywords: [areaNode.label, ...ancestors, node.label, itemStageKeyword(areaSlug, ancestors, node.label)].filter(Boolean),
        level: ancestors.length + 1,
      };
      items.push(item);
      node.children.forEach((child, childIndex) => walk(child, [...ancestors, node.label], id, childIndex));
    };
    areaNode.children.forEach((child, childIndex) => walk(child, [], areaId, childIndex));
  }
  return items;
}

function itemStageKeyword(areaSlug, ancestors, label) {
  const stage = lifecycleFor(areaSlug, ancestors, label);
  return stage === "monitor" || stage === "governance" ? null : stage;
}

const tree = parseTree();
const navItems = flattenNavigation(tree);
const routeItems = navItems.filter((item) => item.route);
const specCopy = spec.replace(/\r\n/g, "\n");

write(path.join(root, "docs", "gold-trader-sidebar-and-structure.md"), specCopy);

write(
  path.join(root, "package.json"),
  `${JSON.stringify(
    {
      private: true,
      name: "cacsms-goldmine",
      version: "0.1.0",
      scripts: {
        dev: "npm --workspace apps/web run dev",
        build: "npm --workspace apps/web run build",
        lint: "npm --workspace apps/web run lint",
        typecheck: "npm --workspace apps/web run typecheck",
        "api:dev": "npm --workspace apps/api run dev",
        verify: "npm run typecheck && npm run lint",
      },
      workspaces: ["apps/web", "apps/api"],
    },
    null,
    2,
  )}\n`,
);

write(
  path.join(root, ".gitignore"),
  ["node_modules", ".next", "dist", "coverage", ".env", ".env.local", "npm-debug.log*", ""].join("\n"),
);

write(
  path.join(root, "apps", "web", "package.json"),
  `${JSON.stringify(
    {
      name: "@cacsms-goldmine/web",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        lint: "eslint .",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@next/eslint-plugin-next": "^15.5.0",
        clsx: "^2.1.1",
        "lucide-react": "^0.468.0",
        next: "^15.5.0",
        react: "^19.1.0",
        "react-dom": "^19.1.0",
      },
      devDependencies: {
        "@types/node": "^22.10.2",
        "@types/react": "^19.0.2",
        "@types/react-dom": "^19.0.2",
        eslint: "^9.17.0",
        typescript: "^5.7.2",
      },
    },
    null,
    2,
  )}\n`,
);

write(
  path.join(root, "apps", "web", "tsconfig.json"),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  )}\n`,
);

write(path.join(root, "apps", "web", "next-env.d.ts"), '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
write(path.join(root, "apps", "web", "next.config.ts"), "import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n");
write(
  path.join(root, "apps", "web", "eslint.config.mjs"),
  "import nextPlugin from '@next/eslint-plugin-next';\n\nexport default [{ ignores: ['.next/**'] }, { plugins: { '@next/next': nextPlugin }, rules: { ...nextPlugin.configs.recommended.rules } }];\n",
);

const navTs = `import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ChartCandlestick,
  Circle,
  FileText,
  Folder,
  GraduationCap,
  LayoutDashboard,
  Power,
  Radar,
  Settings,
  ShieldCheck,
} from "lucide-react";

export type LifecycleStage =
  | "monitor"
  | "start"
  | "initialize"
  | "connect"
  | "validate"
  | "synchronize"
  | "analyse"
  | "plan"
  | "scan"
  | "qualify"
  | "authorize"
  | "execute"
  | "manage"
  | "close"
  | "review"
  | "learn"
  | "repeat"
  | "stop"
  | "governance";

export type FunctionalArea =
  | "executive"
  | "platform-readiness"
  | "market-intelligence"
  | "strategy-opportunity"
  | "risk-execution"
  | "trade-operations"
  | "performance-control"
  | "administration";

export type NavigationItem = {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: keyof typeof navigationIcons;
  parentId: string | null;
  lifecycleStage: LifecycleStage;
  area: FunctionalArea;
  order: number;
  permission: string;
  featureFlag: string;
  statusSource: string;
  alertSource: string;
  disabled: boolean;
  administrationPhase: "initial-development" | "after-certification";
  searchKeywords: string[];
  level: number;
};

export const navigationIcons = {
  Activity,
  ChartCandlestick,
  Circle,
  FileText,
  Folder,
  GraduationCap,
  LayoutDashboard,
  Power,
  Radar,
  Settings,
  ShieldCheck,
} satisfies Record<string, LucideIcon>;

export const navigationItems = ${JSON.stringify(navItems, null, 2)} as const satisfies readonly NavigationItem[];

export const topLevelNavigation = navigationItems.filter((item) => item.parentId === null);

export function getNavigationItemByRoute(route: string) {
  const normalized = route === "/" ? "/executive" : route.replace(/\\/$/, "");
  return navigationItems.find((item) => item.route === normalized);
}

export function getNavigationChildren(parentId: string) {
  return navigationItems.filter((item) => item.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function getNavigationAncestors(item: NavigationItem) {
  const ancestors: NavigationItem[] = [];
  let parentId = item.parentId;
  while (parentId) {
    const parent = navigationItems.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentId;
  }
  return ancestors;
}
`;
write(path.join(root, "apps", "web", "config", "navigation.ts"), navTs);

write(
  path.join(root, "apps", "web", "config", "routes.ts"),
  `export const appRoutes = ${JSON.stringify(routeItems.map((item) => item.route), null, 2)} as const;\n\nexport type AppRoute = (typeof appRoutes)[number];\n`,
);

write(
  path.join(root, "apps", "web", "config", "lifecycle.ts"),
  `import type { LifecycleStage } from "./navigation";

export const lifecycleStages: Record<LifecycleStage, { label: string; area: string; order: number }> = {
  monitor: { label: "Monitor", area: "Executive Command Centre", order: 0 },
  start: { label: "START", area: "Platform Readiness", order: 1 },
  initialize: { label: "INITIALIZE", area: "Platform Readiness", order: 2 },
  connect: { label: "CONNECT", area: "Platform Readiness", order: 3 },
  validate: { label: "VALIDATE", area: "Platform Readiness", order: 4 },
  synchronize: { label: "SYNCHRONIZE", area: "Platform Readiness", order: 5 },
  analyse: { label: "ANALYSE", area: "Gold Market Intelligence", order: 6 },
  plan: { label: "PLAN", area: "Trading Strategy and Opportunity", order: 7 },
  scan: { label: "SCAN", area: "Trading Strategy and Opportunity", order: 8 },
  qualify: { label: "QUALIFY", area: "Trading Strategy and Opportunity", order: 9 },
  authorize: { label: "AUTHORIZE", area: "Risk, Authorization and Execution", order: 10 },
  execute: { label: "EXECUTE", area: "Risk, Authorization and Execution", order: 11 },
  manage: { label: "MANAGE", area: "Position and Trade Operations", order: 12 },
  close: { label: "CLOSE", area: "Position and Trade Operations", order: 13 },
  review: { label: "REVIEW", area: "Performance, Learning and Control", order: 14 },
  learn: { label: "LEARN", area: "Performance, Learning and Control", order: 15 },
  repeat: { label: "REPEAT", area: "Performance, Learning and Control", order: 16 },
  stop: { label: "STOP", area: "Performance, Learning and Control", order: 17 },
  governance: { label: "GOVERNANCE", area: "Platform Administration", order: 18 },
};

export const currentLifecycleStage: LifecycleStage = "start";
`,
);

write(
  path.join(root, "apps", "web", "config", "feature-flags.ts"),
  `export const featureFlags = {
  trading_system_enabled: true,
  administration_enabled: false,
  authentication_enabled: false,
  tenant_isolation_enabled: false,
  role_enforcement_enabled: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
`,
);

write(
  path.join(root, "apps", "web", "config", "permissions.ts"),
  `import { navigationItems } from "./navigation";

export const permissions = Object.fromEntries(
  navigationItems.map((item) => [item.permission, { pageId: item.id, route: item.route }]),
) as Record<string, { pageId: string; route: string }>;
`,
);

write(
  path.join(root, "apps", "web", "config", "route-metadata.ts"),
  `import { navigationItems } from "./navigation";

export const routeMetadata = Object.fromEntries(
  navigationItems.map((item) => [
    item.route,
    {
      id: item.id,
      label: item.label,
      permission: item.permission,
      statusSource: item.statusSource,
      alertSource: item.alertSource,
      auditIdentity: \`audit.\${item.id}\`,
      lifecycleStage: item.lifecycleStage,
      administrationPhase: item.administrationPhase,
    },
  ]),
) as Record<
  string,
  {
    id: string;
    label: string;
    permission: string;
    statusSource: string;
    alertSource: string;
    auditIdentity: string;
    lifecycleStage: string;
    administrationPhase: string;
  }
>;
`,
);

write(
  path.join(root, "apps", "web", "config", "navigation-status.ts"),
  `export type NavigationStatusColor = "grey" | "blue" | "amber" | "green" | "red" | "purple" | "teal" | "black";

export const navigationStatusIndicators: Record<string, { label: string; color: NavigationStatusColor; value?: string }> = {
  "platform-readiness.status": { label: "82%", color: "green", value: "82%" },
  "market-intelligence.status": { label: "Analysing", color: "blue" },
  "strategy-opportunity.status": { label: "3 opportunities", color: "purple" },
  "risk-execution.status": { label: "1 pending", color: "amber" },
  "trade-operations.status": { label: "5 active positions", color: "teal" },
  "performance-control.status": { label: "Learning", color: "purple" },
  "executive.status": { label: "Monitoring", color: "blue" },
  "administration.status": { label: "Disabled", color: "grey" },
};
`,
);

write(
  path.join(root, "apps", "web", "config", "environment.ts"),
  `export const environment = {
  appName: "Gold Trader",
  marketSymbol: "XAUUSD",
  productionDatabaseRequired: true,
  realtimeServicesRequired: true,
} as const;
`,
);

const globalCss = `:root {
  color-scheme: dark;
  --bg: #0b0d10;
  --panel: #14181d;
  --panel-soft: #1a2027;
  --line: #2a313a;
  --text: #f4f7fb;
  --muted: #aab3bf;
  --accent: #e0b84f;
  --accent-2: #45b6a9;
  --danger: #ee6b6e;
  --warning: #f5a742;
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: Arial, Helvetica, sans-serif; letter-spacing: 0; }
a { color: inherit; text-decoration: none; }
button, input { font: inherit; }

.app-shell { display: grid; grid-template-columns: minmax(280px, 340px) 1fr; min-height: 100vh; }
.sidebar { border-right: 1px solid var(--line); background: #101418; overflow-y: auto; max-height: 100vh; position: sticky; top: 0; }
.sidebar-header { padding: 18px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.brand { display: grid; gap: 3px; }
.brand strong { font-size: 18px; }
.brand span { color: var(--muted); font-size: 12px; }
.sidebar-controls { padding: 12px; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }
.sidebar-controls input { width: 100%; border: 1px solid var(--line); background: var(--panel); color: var(--text); border-radius: 6px; padding: 9px 10px; }
.icon-button { width: 34px; height: 34px; display: inline-grid; place-items: center; border: 1px solid var(--line); background: var(--panel); color: var(--text); border-radius: 6px; cursor: pointer; }
.nav-list { padding: 10px; display: grid; gap: 2px; }
.nav-row { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 8px; min-height: 34px; padding: 7px 8px; border-radius: 6px; color: var(--muted); }
.nav-row:hover, .nav-row.active { background: var(--panel-soft); color: var(--text); }
.nav-row.current-stage { box-shadow: inset 3px 0 0 var(--accent); }
.nav-row.disabled { opacity: .58; }
.nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.nav-status { width: 9px; height: 9px; border-radius: 999px; background: #6d7784; }
.status-grey { background: #6d7784; }
.status-blue { background: #4ea1ff; }
.status-amber { background: var(--warning); }
.status-green { background: #53d18c; }
.status-red { background: var(--danger); }
.status-purple { background: #b88cff; }
.status-teal { background: var(--accent-2); }
.status-black { background: #000; border: 1px solid #555; }
.main { min-width: 0; }
.topbar { height: 64px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; padding: 0 22px; background: rgba(11, 13, 16, .92); position: sticky; top: 0; z-index: 5; }
.search-button { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--muted); border-radius: 6px; padding: 8px 12px; }
.content { padding: 24px; display: grid; gap: 18px; }
.page-header { display: grid; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
.breadcrumb { display: flex; flex-wrap: wrap; gap: 8px; color: var(--muted); font-size: 13px; }
.breadcrumb span:not(:last-child)::after { content: "/"; margin-left: 8px; color: #59616d; }
h1 { margin: 0; font-size: clamp(28px, 4vw, 44px); line-height: 1.05; }
h2 { font-size: 18px; margin: 0 0 12px; }
.metadata { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { border: 1px solid var(--line); background: var(--panel); color: var(--muted); border-radius: 999px; padding: 6px 10px; font-size: 12px; }
.pill.gold { border-color: rgba(224, 184, 79, .45); color: #f3d781; }
.grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.section { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 16px; }
.section p { color: var(--muted); margin: 0; line-height: 1.55; }
.kpi { display: grid; gap: 6px; }
.kpi strong { font-size: 22px; }
.workspace { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, .6fr); gap: 12px; }
.matrix { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.cell { min-height: 82px; border: 1px solid var(--line); border-radius: 6px; padding: 10px; background: #11161b; display: grid; align-content: space-between; }
.cell span, .timeline li, .table td, .table th { color: var(--muted); font-size: 13px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px; border-bottom: 1px solid var(--line); text-align: left; }
.timeline { margin: 0; padding-left: 18px; display: grid; gap: 10px; }
.empty, .error-box, .loading-box { border: 1px dashed var(--line); border-radius: 8px; padding: 14px; color: var(--muted); }
.error-box { border-color: rgba(238, 107, 110, .6); }
.mobile-only { display: none; }

@media (max-width: 900px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { position: fixed; inset: 0 auto 0 0; width: min(86vw, 340px); z-index: 20; transform: translateX(-105%); transition: transform .2s ease; }
  .sidebar.open { transform: translateX(0); }
  .mobile-only { display: inline-grid; }
  .grid, .workspace { grid-template-columns: 1fr; }
  .content { padding: 16px; }
}
`;
write(path.join(root, "apps", "web", "app", "globals.css"), globalCss);

write(
  path.join(root, "apps", "web", "app", "layout.tsx"),
  `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gold Trader",
  description: "Autonomous gold trading command platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "app", "page.tsx"),
  `import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/executive");
}
`,
);

write(
  path.join(root, "apps", "web", "app", "loading.tsx"),
  `export default function Loading() {
  return <div className="loading-box">Loading operational workspace...</div>;
}
`,
);

write(
  path.join(root, "apps", "web", "app", "error.tsx"),
  `"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="content">
      <section className="error-box">
        <strong>Workspace error</strong>
        <p>{error.message}</p>
        <button className="search-button" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "app", "not-found.tsx"),
  `import Link from "next/link";

export default function NotFound() {
  return (
    <main className="content">
      <section className="empty">
        <h1>Page not found</h1>
        <p>The requested route is not registered in the Gold Trader navigation configuration.</p>
        <Link href="/executive">Return to Executive Command Centre</Link>
      </section>
    </main>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "app", "(gold-trader)", "layout.tsx"),
  `import { AppShell } from "@/components/layout/app-shell";

export default function GoldTraderLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "app-shell.tsx"),
  `"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="main">
        <Topbar onOpenNavigation={() => setMobileOpen(true)} />
        {children}
      </main>
      <button className="icon-button mobile-only" style={{ position: "fixed", right: 16, bottom: 16, zIndex: 30 }} onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu size={18} />
      </button>
    </div>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "sidebar.tsx"),
  `"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Search, Star } from "lucide-react";
import { currentLifecycleStage } from "@/config/lifecycle";
import { featureFlags } from "@/config/feature-flags";
import { navigationIcons, navigationItems, topLevelNavigation } from "@/config/navigation";
import { navigationStatusIndicators } from "@/config/navigation-status";
import type { NavigationItem } from "@/config/navigation";
import { SidebarItem } from "./sidebar-item";

const storageKey = "gold-trader-expanded-navigation";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const activeArea = navigationItems.find((item) => pathname.startsWith(item.route) && item.level === 0)?.id ?? "executive";
  const [expanded, setExpanded] = useState<Set<string>>(new Set([activeArea]));
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setExpanded(new Set(JSON.parse(stored) as string[]));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify([...expanded]));
  }, [expanded]);

  useEffect(() => {
    const current = navigationItems.find((item) => item.route === pathname);
    if (!current) return;
    setRecent((value) => [current.id, ...value.filter((id) => id !== current.id)].slice(0, 5));
  }, [pathname]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return navigationItems.filter((item) =>
      [item.label, item.description, item.route, ...item.searchKeywords].join(" ").toLowerCase().includes(normalized),
    );
  }, [query]);

  const toggle = (id: string) => {
    setExpanded((value) => {
      const next = new Set(value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((value) => {
      const next = new Set(value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTree = (parentId: string | null, level = 0): React.ReactNode => {
    const children = (parentId ? navigationItems.filter((item) => item.parentId === parentId) : topLevelNavigation).sort((a, b) => a.order - b.order);
    return children.map((item) => {
      const childCount = navigationItems.filter((candidate) => candidate.parentId === item.id).length;
      const isExpanded = expanded.has(item.id) || item.id === activeArea;
      const Icon = navigationIcons[item.icon];
      const enabled = featureFlags[item.featureFlag as keyof typeof featureFlags] ?? true;
      const status = navigationStatusIndicators[item.statusSource] ?? (item.level === 0 ? navigationStatusIndicators[\`\${item.area}.status\`] : undefined);
      return (
        <div key={item.id}>
          <div style={{ display: "grid", gridTemplateColumns: childCount ? "28px 1fr" : "28px 1fr", alignItems: "center" }}>
            <button className="icon-button" style={{ visibility: childCount ? "visible" : "hidden", width: 28, height: 28 }} onClick={() => toggle(item.id)} aria-label={isExpanded ? "Collapse" : "Expand"} title={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            <SidebarItem
              item={item as NavigationItem}
              active={pathname === item.route}
              currentStage={item.lifecycleStage === currentLifecycleStage}
              disabled={!enabled || item.disabled}
              compact={compact}
              icon={<Icon size={16} />}
              status={status}
              favorite={favorites.has(item.id)}
              onFavorite={() => toggleFavorite(item.id)}
              onNavigate={onClose}
              level={level}
            />
          </div>
          {childCount > 0 && isExpanded ? <div>{renderTree(item.id, level + 1)}</div> : null}
        </div>
      );
    });
  };

  const renderFlat = (items: readonly NavigationItem[]) => (
    <div className="nav-list">
      {items.map((item) => {
        const Icon = navigationIcons[item.icon];
        return (
          <SidebarItem
            key={item.id}
            item={item}
            active={pathname === item.route}
            currentStage={item.lifecycleStage === currentLifecycleStage}
            disabled={!(featureFlags[item.featureFlag as keyof typeof featureFlags] ?? true) || item.disabled}
            compact={compact}
            icon={<Icon size={16} />}
            status={navigationStatusIndicators[item.statusSource]}
            favorite={favorites.has(item.id)}
            onFavorite={() => toggleFavorite(item.id)}
            onNavigate={onClose}
            level={0}
          />
        );
      })}
    </div>
  );

  const favoriteItems = navigationItems.filter((item) => favorites.has(item.id));
  const recentItems = recent.map((id) => navigationItems.find((item) => item.id === id)).filter(Boolean) as NavigationItem[];

  return (
    <aside className={\`sidebar \${mobileOpen ? "open" : ""}\`}>
      <div className="sidebar-header">
        <div className="brand">
          <strong>Gold Trader</strong>
          <span>Autonomous XAUUSD control</span>
        </div>
        <button className="icon-button" onClick={() => setCompact((value) => !value)} title={compact ? "Full mode" : "Compact mode"} aria-label={compact ? "Full mode" : "Compact mode"}>
          {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>
      <div className="sidebar-controls">
        <label style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages and commands" style={{ paddingLeft: 32 }} />
        </label>
      </div>
      {query ? renderFlat(visibleItems ?? []) : (
        <>
          {favoriteItems.length ? <section className="nav-list" aria-label="Favourite pages"><div className="pill"><Star size={12} /> Favourite pages</div>{renderFlat(favoriteItems)}</section> : null}
          {recentItems.length ? <section className="nav-list" aria-label="Recent pages"><div className="pill">Recent pages</div>{renderFlat(recentItems)}</section> : null}
          <nav className="nav-list" aria-label="Primary navigation">{renderTree(null)}</nav>
        </>
      )}
    </aside>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "sidebar-item.tsx"),
  `"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { NavigationItem } from "@/config/navigation";
import type { NavigationStatusColor } from "@/config/navigation-status";

export function SidebarItem({
  item,
  active,
  currentStage,
  disabled,
  compact,
  icon,
  status,
  favorite,
  onFavorite,
  onNavigate,
  level,
}: {
  item: NavigationItem;
  active: boolean;
  currentStage: boolean;
  disabled: boolean;
  compact: boolean;
  icon: React.ReactNode;
  status?: { label: string; color: NavigationStatusColor; value?: string };
  favorite: boolean;
  onFavorite: () => void;
  onNavigate: () => void;
  level: number;
}) {
  return (
    <Link
      href={item.route}
      onClick={onNavigate}
      className={\`nav-row \${active ? "active" : ""} \${currentStage ? "current-stage" : ""} \${disabled ? "disabled" : ""}\`}
      style={{ paddingLeft: Math.min(8 + level * 14, 48) }}
      aria-disabled={disabled}
      title={compact ? item.label : item.description}
    >
      <span>{icon}</span>
      {!compact ? <span className="nav-label">{item.label}</span> : <span className="nav-label" style={{ width: 0 }} />}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {status ? <span className={\`nav-status status-\${status.color}\`} title={status.label} /> : null}
        <button type="button" className="icon-button" style={{ width: 24, height: 24 }} onClick={(event) => { event.preventDefault(); onFavorite(); }} aria-label={favorite ? "Remove favourite" : "Add favourite"} title={favorite ? "Remove favourite" : "Add favourite"}>
          <Star size={12} fill={favorite ? "currentColor" : "none"} />
        </button>
      </span>
    </Link>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "topbar.tsx"),
  `"use client";

import { Command, Menu, RefreshCw } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { useState } from "react";

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="icon-button mobile-only" onClick={onOpenNavigation} aria-label="Open navigation"><Menu size={18} /></button>
        <button className="search-button" onClick={() => setOpen(true)}><Command size={16} /> Command palette</button>
      </div>
      <div className="metadata">
        <span className="pill gold">XAUUSD</span>
        <span className="pill">Production data required</span>
        <button className="icon-button" aria-label="Retry refresh" title="Retry refresh"><RefreshCw size={16} /></button>
      </div>
      {open ? <CommandPalette onClose={() => setOpen(false)} /> : null}
    </header>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "command-palette.tsx"),
  `"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { navigationItems } from "@/config/navigation";

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    return navigationItems
      .filter((item) => !value || [item.label, item.route, item.permission, ...item.searchKeywords].join(" ").toLowerCase().includes(value))
      .slice(0, 18);
  }, [query]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.58)", zIndex: 50, display: "grid", placeItems: "start center", paddingTop: 90 }}>
      <section className="section" style={{ width: "min(720px, calc(100vw - 28px))" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a page, command, permission, or lifecycle stage" style={{ border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)", borderRadius: 6, padding: 12 }} />
          <button className="icon-button" onClick={onClose} aria-label="Close command palette"><X size={18} /></button>
        </div>
        <div className="nav-list" style={{ maxHeight: 440, overflow: "auto" }}>
          {results.map((item) => (
            <Link key={item.id} href={item.route} className="nav-row" onClick={onClose}>
              <span className="nav-status status-blue" />
              <span className="nav-label">{item.label}</span>
              <span className="pill">{item.lifecycleStage}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "breadcrumb.tsx"),
  `import { getNavigationAncestors, type NavigationItem } from "@/config/navigation";

export function Breadcrumb({ item }: { item: NavigationItem }) {
  const ancestors = getNavigationAncestors(item);
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {[...ancestors, item].map((entry) => <span key={entry.id}>{entry.label}</span>)}
    </nav>
  );
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "sidebar-group.tsx"),
  `export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <div className="nav-list">{children}</div>;
}
`,
);

write(
  path.join(root, "apps", "web", "components", "layout", "mobile-navigation.tsx"),
  `export function MobileNavigation({ children }: { children: React.ReactNode }) {
  return <div className="mobile-only">{children}</div>;
}
`,
);

write(
  path.join(root, "apps", "web", "components", "ui", "operational-page.tsx"),
  `import { notFound } from "next/navigation";
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
`,
);

for (const item of routeItems) {
  const routeSegments = item.route.split("/").filter(Boolean);
  const pagePath = path.join(root, "apps", "web", "app", "(gold-trader)", ...routeSegments, "page.tsx");
  write(
    pagePath,
    `import { OperationalPage } from "@/components/ui/operational-page";

export default function Page() {
  return <OperationalPage route="${item.route}" />;
}
`,
  );
}

for (const route of apiRoutes) {
  write(
    path.join(root, "apps", "web", "app", "api", route, "route.ts"),
    `export async function GET() {
  return Response.json({ status: "ok", boundary: "${route}", source: "production-service-placeholder" });
}
`,
  );
}

const featureModules = [
  "executive",
  "platform-readiness",
  "market-intelligence",
  "strategy-opportunity",
  "risk-execution",
  "trade-operations",
  "performance-control",
  "administration",
];
const featureSubmodules = {
  "market-intelligence": ["top-down", "institutional", "retail", "gold-usd-strength", "usd-news", "sessions", "market-regime", "hybrid-confluence"],
};
for (const moduleName of featureModules) {
  for (const folder of ["components", "hooks", "services", "stores", "schemas", "types", "utils", "constants", "tests"]) {
    touch(path.join(root, "apps", "web", "features", moduleName, folder, ".gitkeep"));
  }
  for (const submodule of featureSubmodules[moduleName] ?? []) {
    for (const folder of ["components", "hooks", "services", "stores", "schemas", "types", "tests"]) {
      touch(path.join(root, "apps", "web", "features", moduleName, submodule, folder, ".gitkeep"));
    }
  }
}

for (const folder of ["lifecycle", "trading", "charts", "tables", "status", "alerts", "dialogs", "forms"]) {
  touch(path.join(root, "apps", "web", "components", folder, ".gitkeep"));
}

const sharedFiles = {
  "hooks/use-lifecycle.ts": "export { currentLifecycleStage } from '@/config/lifecycle';\n",
  "hooks/use-market-data.ts": "export function useMarketData() { return { status: 'unbound', data: null }; }\n",
  "hooks/use-opportunities.ts": "export function useOpportunities() { return { status: 'unbound', data: [] }; }\n",
  "hooks/use-positions.ts": "export function usePositions() { return { status: 'unbound', data: [] }; }\n",
  "hooks/use-risk.ts": "export function useRisk() { return { status: 'unbound', data: null }; }\n",
  "hooks/use-websocket.ts": "export function useWebsocket() { return { connected: false }; }\n",
  "hooks/use-permissions.ts": "export function usePermissions() { return { can: (_permission: string) => true }; }\n",
  "lib/api-client.ts": "export async function apiClient<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> { const response = await fetch(input, init); if (!response.ok) throw new Error(`API request failed: ${response.status}`); return response.json() as Promise<T>; }\n",
  "lib/websocket-client.ts": "export function createWebsocketClient(url: string) { return new WebSocket(url); }\n",
  "lib/formatting.ts": "export function formatPercent(value: number) { return `${value.toFixed(1)}%`; }\n",
  "lib/validation.ts": "export function requireValue<T>(value: T | null | undefined, label: string): T { if (value == null) throw new Error(`${label} is required`); return value; }\n",
  "lib/dates.ts": "export function formatTimestamp(value: Date) { return value.toISOString(); }\n",
  "lib/trading-math.ts": "export function riskToReward(risk: number, reward: number) { return risk === 0 ? 0 : reward / risk; }\n",
  "lib/permissions.ts": "export { permissions } from '@/config/permissions';\n",
  "lib/errors.ts": "export class OperationalServiceError extends Error {}\n",
  "services/lifecycle.service.ts": "export async function getLifecycleStatus() { return { stage: 'start', status: 'waiting' }; }\n",
  "services/market-data.service.ts": "export async function getMarketDataStatus() { return { symbol: 'XAUUSD', status: 'unbound' }; }\n",
  "services/analysis.service.ts": "export async function getAnalysisStatus() { return { status: 'unbound' }; }\n",
  "services/news.service.ts": "export async function getNewsStatus() { return { status: 'unbound' }; }\n",
  "services/opportunity.service.ts": "export async function getOpportunityStatus() { return { count: 0 }; }\n",
  "services/risk.service.ts": "export async function getRiskStatus() { return { status: 'unbound' }; }\n",
  "services/execution.service.ts": "export async function getExecutionStatus() { return { status: 'unbound' }; }\n",
  "services/position.service.ts": "export async function getPositionStatus() { return { active: 0 }; }\n",
  "services/review.service.ts": "export async function getReviewStatus() { return { status: 'unbound' }; }\n",
  "services/learning.service.ts": "export async function getLearningStatus() { return { status: 'unbound' }; }\n",
  "services/administration.service.ts": "export async function getAdministrationStatus() { return { enabled: false }; }\n",
};
for (const [relative, content] of Object.entries(sharedFiles)) {
  write(path.join(root, "apps", "web", relative), content);
}

for (const folder of ["unit", "integration", "components", "accessibility", "e2e"]) {
  touch(path.join(root, "apps", "web", "tests", folder, ".gitkeep"));
}
for (const file of ["lifecycle", "market", "analysis", "opportunity", "risk", "execution", "position", "review", "administration", "common"]) {
  write(path.join(root, "apps", "web", "types", `${file}.ts`), "export type EmptyRecord = Record<string, never>;\n");
}
for (const file of ["lifecycle", "market", "opportunity", "execution", "position", "alert", "navigation"]) {
  write(path.join(root, "apps", "web", "stores", `${file}.store.ts`), "export const storeStatus = 'unbound';\n");
}

write(
  path.join(root, "apps", "api", "package.json"),
  `${JSON.stringify(
    {
      name: "@cacsms-goldmine/api",
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "tsx src/main.ts",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@types/node": "^22.10.2",
        tsx: "^4.19.2",
        typescript: "^5.7.2",
      },
    },
    null,
    2,
  )}\n`,
);
write(
  path.join(root, "apps", "api", "tsconfig.json"),
  `${JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, esModuleInterop: true, skipLibCheck: true }, include: ["src/**/*.ts"] }, null, 2)}\n`,
);
write(
  path.join(root, "apps", "api", "src", "main.ts"),
  "import { createApp } from './app.js';\n\nconst app = createApp();\nconsole.log(`Gold Trader API boundary ready: ${app.name}`);\n",
);
write(
  path.join(root, "apps", "api", "src", "app.ts"),
  "export function createApp() { return { name: 'gold-trader-api', status: 'service-boundary' } as const; }\n",
);

for (const file of ["environment", "database", "mt5", "news", "risk"]) {
  write(path.join(root, "apps", "api", "src", "config", `${file}.ts`), `export const ${file.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Config = { enabled: false } as const;\n`);
}
for (const folder of ["lifecycle", "platform-readiness", "market-data", "market-intelligence", "strategy", "opportunity", "risk", "authorization", "execution", "positions", "baskets", "closures", "reviews", "learning", "administration", "audit"]) {
  touch(path.join(root, "apps", "api", "src", "modules", folder, ".gitkeep"));
}
for (const file of ["lifecycle-orchestrator", "analysis-orchestrator", "opportunity-orchestrator", "execution-orchestrator", "learning-orchestrator"]) {
  write(path.join(root, "apps", "api", "src", "orchestration", `${file}.ts`), `export const ${file.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} = { status: 'unbound' } as const;\n`);
}
for (const file of ["market-analyst", "institutional-trader", "retail-trader", "news-analyst", "strategy-planner", "opportunity-qualifier", "risk-officer", "execution", "position-manager", "trade-reviewer", "learning"]) {
  write(path.join(root, "apps", "api", "src", "agents", `${file}.agent.ts`), `export const ${file.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Agent = { status: 'unbound' } as const;\n`);
}
for (const folder of ["mt5", "broker", "market-data", "news", "economic-calendar", "notifications"]) touch(path.join(root, "apps", "api", "src", "integrations", folder, ".gitkeep"));
for (const folder of ["migrations", "repositories", "entities", "views", "seeds"]) touch(path.join(root, "apps", "api", "src", "database", folder, ".gitkeep"));
for (const folder of ["publishers", "subscribers", "handlers"]) touch(path.join(root, "apps", "api", "src", "events", folder, ".gitkeep"));
write(path.join(root, "apps", "api", "src", "events", "event-types.ts"), "export type GoldTraderEventType = 'lifecycle' | 'analysis' | 'execution' | 'audit';\n");
for (const file of ["gateway", "channels", "messages"]) write(path.join(root, "apps", "api", "src", "websocket", `${file}.ts`), `export const ${file} = { status: 'unbound' } as const;\n`);
for (const file of ["market-sync", "news-sync", "session-reset", "daily-review", "backup"]) write(path.join(root, "apps", "api", "src", "jobs", `${file}.job.ts`), `export const ${file.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Job = { enabled: false } as const;\n`);
for (const folder of ["errors", "logging", "validation", "security", "math", "time", "constants"]) touch(path.join(root, "apps", "api", "src", "shared", folder, ".gitkeep"));
for (const folder of ["unit", "integration", "orchestration", "execution"]) touch(path.join(root, "apps", "api", "src", "tests", folder, ".gitkeep"));

console.log(`Generated ${navItems.length} navigation items and ${routeItems.length} routed pages.`);
