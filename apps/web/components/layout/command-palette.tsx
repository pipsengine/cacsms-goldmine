"use client";

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
