"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Key,
  KeyRound,
  LayoutDashboard,
  Library,
  Plug,
  ScrollText,
} from "lucide-react";

const STORAGE_KEY = "autochain-dashboard-sidebar-collapsed";

export function DashboardSidebar() {
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useStateSynced(STORAGE_KEY, false);

  const nav = [
    {
      href: "/dashboard",
      label: "Overview",
      Icon: LayoutDashboard,
      match: (p: string) => p === "/dashboard" || p === "/dashboard/",
    },
    {
      href: "/dashboard/artifacts",
      label: "Artifacts",
      Icon: Archive,
      match: (p: string) => p.startsWith("/dashboard/artifacts"),
    },
    {
      href: "/dashboard/secrets",
      label: "Secrets",
      Icon: Key,
      match: (p: string) => p.startsWith("/dashboard/secrets"),
    },
    {
      href: "/dashboard/integrations",
      label: "Integrations",
      Icon: Plug,
      match: (p: string) => p.startsWith("/dashboard/integrations"),
    },
    {
      href: "/dashboard/api-keys",
      label: "API keys",
      Icon: KeyRound,
      match: (p: string) => p.startsWith("/dashboard/api-keys"),
    },
    {
      href: "/dashboard/audit-logs",
      label: "Audit logs",
      Icon: ScrollText,
      match: (p: string) => p.startsWith("/dashboard/audit-logs"),
    },
    {
      href: "/dashboard/decision-trail",
      label: "Decision Trail",
      Icon: FileSearch,
      match: (p: string) => p.startsWith("/dashboard/decision-trail"),
    },
    {
      href: "/dashboard/sla-monitor",
      label: "SLA Monitor",
      Icon: Activity,
      match: (p: string) => p.startsWith("/dashboard/sla-monitor"),
    },
  ];

  return (
    <aside
      className="shrink-0 border-r flex flex-col transition-[width] duration-200 ease-out h-screen sticky top-0 z-30"
      style={{
        width: collapsed ? 72 : 220,
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
      aria-label="Dashboard navigation"
    >
      <div
        className="h-12 flex items-center px-3 border-b gap-2"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Library
          className="w-4 h-4 shrink-0 text-primary"
          aria-hidden
        />
        {!collapsed && (
          <span
            className="text-[11px] font-semibold uppercase tracking-wider truncate"
            style={{ color: "var(--text-muted)" }}
          >
            Libraries
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: "var(--text-muted)" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "transparent",
                color: active
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                border: active ? "1px solid color-mix(in srgb, var(--primary) 40%, transparent)" : "1px solid transparent",
              }}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-90" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function useStateSynced(key: string, initial: boolean) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return initial;
    try {
      return window.localStorage.getItem(key) === "1";
    } catch {
      return initial;
    }
  });

  const set = (v: boolean | ((b: boolean) => boolean)) => {
    setCollapsed((prev) => {
      const next = typeof v === "function" ? (v as (b: boolean) => boolean)(prev) : v;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return [collapsed, set] as const;
}
