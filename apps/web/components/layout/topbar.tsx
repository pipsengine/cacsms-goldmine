"use client";

import { Bell, CircleUserRound, Command, Menu, RefreshCw } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { currentLifecycleStage, lifecycleStages } from "@/config/lifecycle";
import { getNavigationAncestors, getNavigationItemByRoute } from "@/config/navigation";

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentItem = getNavigationItemByRoute(pathname);
  const crumbs = currentItem ? [...getNavigationAncestors(currentItem), currentItem] : [];
  const lifecycle = lifecycleStages[currentLifecycleStage];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-only" onClick={onOpenNavigation} aria-label="Open navigation"><Menu size={18} /></button>
        <div className="topbar-context">
          <nav className="breadcrumb" aria-label="Current location">
            {crumbs.length ? crumbs.slice(-3).map((crumb) => <span key={crumb.id}>{crumb.label}</span>) : <span>Executive Command Centre</span>}
          </nav>
          <div className="topbar-centre">
            <span className="pill gold">Lifecycle: {lifecycle.label}</span>
            <span>Current action: Evaluating H8 sell-side liquidity sweep</span>
            <span className="pill info">Limited mode</span>
          </div>
        </div>
        <button className="search-button" onClick={() => setOpen(true)}><Command size={16} /> Command palette <span className="pill">Ctrl K</span></button>
      </div>
      <div className="topbar-right">
        <span className="pill gold">XAUUSD</span>
        <span className="pill success">MT5 Connected</span>
        <span className="pill success">Broker Ready</span>
        <span className="pill">London Session</span>
        <span className="pill">Updated 4 sec ago</span>
        <button className="icon-button" aria-label="Refresh status" title="Refresh status"><RefreshCw size={16} /></button>
        <button className="icon-button" aria-label="Notifications" title="Notifications"><Bell size={16} /></button>
        <button className="icon-button" aria-label="User menu placeholder" title="User menu placeholder"><CircleUserRound size={17} /></button>
      </div>
      {open ? <CommandPalette onClose={() => setOpen(false)} /> : null}
    </header>
  );
}
