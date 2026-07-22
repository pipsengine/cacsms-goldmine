"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Brain,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
  CircleDot,
  GraduationCap,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  Radar,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Target,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { currentLifecycleStage } from "@/config/lifecycle";
import { featureFlags } from "@/config/feature-flags";
import { navigationIcons, navigationItems, topLevelNavigation } from "@/config/navigation";
import { navigationStatusIndicators } from "@/config/navigation-status";
import type { NavigationItem } from "@/config/navigation";
import { SidebarItem } from "./sidebar-item";

const storageKey = "cacsms-goldmine-expanded-navigation";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const activeArea = navigationItems.find((item) => pathname.startsWith(item.route) && item.level === 0)?.id ?? "executive";
  const [expanded, setExpanded] = useState<Set<string>>(new Set([activeArea]));
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [recentOpen, setRecentOpen] = useState(true);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        document.getElementById("sidebar-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      const Icon = getSidebarIcon(item);
      const enabled = featureFlags[item.featureFlag as keyof typeof featureFlags] ?? true;
      const status = navigationStatusIndicators[item.statusSource] ?? (item.level === 0 ? navigationStatusIndicators[`${item.area}.status`] : undefined);
      return (
        <div key={item.id}>
          <div className="nav-branch" style={{ gridTemplateColumns: childCount && !compact ? "28px 1fr" : compact ? "1fr" : "28px 1fr", alignItems: "center" }}>
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
        const Icon = getSidebarIcon(item);
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
  const activeItem = navigationItems.find((item) => item.route === pathname);
  const recentItems = recent
    .filter((id) => id !== activeItem?.id)
    .map((id) => navigationItems.find((item) => item.id === id))
    .filter(Boolean) as NavigationItem[];

  return (
    <aside className={`sidebar ${compact ? "compact" : ""} ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <div className="logo-mark">CG</div>
          <div className="brand-copy">
            <strong>CACSMS Goldmine</strong>
            <span>Autonomous Trading Control</span>
            <span className="environment-badge">Demo</span>
          </div>
        </div>
        <button className="icon-button" onClick={() => setCompact((value) => !value)} title={compact ? "Full mode" : "Compact mode"} aria-label={compact ? "Full mode" : "Compact mode"}>
          {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>
      <div className="sidebar-controls">
        <label style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input id="sidebar-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, stages, and commands" style={{ paddingLeft: 32, paddingRight: 38 }} />
          <span className="keyboard-hint">/</span>
        </label>
      </div>
      {query ? renderFlat(visibleItems ?? []) : (
        <>
          {favoriteItems.length ? <section className="nav-list" aria-label="Favourite pages"><div className="pill"><Star size={12} /> Favourite pages</div>{renderFlat(favoriteItems)}</section> : null}
          {recentItems.length ? (
            <section className="nav-list recent-section" aria-label="Recent pages">
              <button className="nav-section-title" onClick={() => setRecentOpen((value) => !value)}>
                <span>Recent pages</span>
                {recentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {recentOpen ? renderFlat(recentItems) : null}
            </section>
          ) : null}
          <nav className="nav-list" aria-label="Primary navigation">
            <div className="nav-section-title"><span>Functional areas</span><span>8</span></div>
            {renderTree(null)}
          </nav>
        </>
      )}
    </aside>
  );
}

function getSidebarIcon(item: NavigationItem) {
  const text = `${item.label} ${item.id}`.toLowerCase();
  if (item.area === "executive") return text.includes("lifecycle") ? Workflow : text.includes("risk") ? ShieldCheck : text.includes("performance") ? Activity : text.includes("alert") ? Bell : Activity;
  if (item.area === "platform-readiness") return text.includes("connect") ? Route : Power;
  if (item.area === "market-intelligence") return text.includes("strength") ? Radar : text.includes("institutional") ? Brain : text.includes("retail") ? CandlestickChart : Radar;
  if (item.area === "strategy-opportunity") return text.includes("scan") ? Radar : Target;
  if (item.area === "risk-execution") return text.includes("execute") || text.includes("order") ? Zap : ShieldCheck;
  if (item.area === "trade-operations") return text.includes("basket") || text.includes("position") ? Layers : Activity;
  if (item.area === "performance-control") return text.includes("learn") ? GraduationCap : Activity;
  if (item.area === "administration") return text.includes("user") || text.includes("tenant") ? Users : Settings;
  return navigationIcons[item.icon] ?? CircleDot;
}
