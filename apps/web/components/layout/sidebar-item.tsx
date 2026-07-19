"use client";

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
      href={disabled ? "#" : item.route}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onNavigate();
      }}
      className={`nav-row ${active ? "active" : ""} ${currentStage ? "current-stage" : ""} ${disabled ? "disabled" : ""}`}
      style={{ paddingLeft: compact ? undefined : Math.min(10 + level * 14, 50) }}
      aria-disabled={disabled}
      title={`${item.label}. ${disabled && item.area === "administration" ? "Planned after certification." : item.description}`}
    >
      <span>{icon}</span>
      {!compact ? <span className="nav-label">{item.label}</span> : <span className="nav-label" style={{ width: 0 }} />}
      <span className="nav-meta" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {status ? <span className={`nav-status status-${status.color}`} title={status.label} /> : null}
        {item.area === "administration" && disabled ? <span className="pill" style={{ padding: "4px 7px" }}>Planned</span> : null}
        <button type="button" className={`icon-button favorite-button ${favorite ? "active" : ""}`} style={{ width: 24, height: 24 }} onClick={(event) => { event.preventDefault(); onFavorite(); }} aria-label={favorite ? "Remove favourite" : "Add favourite"} title={favorite ? "Remove favourite" : "Add favourite"}>
          <Star size={12} fill={favorite ? "currentColor" : "none"} />
        </button>
      </span>
    </Link>
  );
}
