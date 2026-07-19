"use client";

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
