"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useToast } from "@/components/hooks/use-toast";
import { useDashboardUI } from "@/components/dashboard/DashboardUIProvider";
import {
  Zap,
  Sun,
  Moon,
  Bell,
  Settings,
  ChevronsUpDown,
  Check,
  FolderPlus,
} from "lucide-react";

export function DashboardTopBar() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { theme, toggleTheme } = useTheme();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { toast } = useToast();
  const { openCreateWorkspace } = useDashboardUI();

  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);
  const wsSwitcherRef = useRef<HTMLDivElement>(null);

  const userName =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || '{"name":"Dev User"}').name
      : "Dev User";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wsSwitcherRef.current &&
        !wsSwitcherRef.current.contains(e.target as Node)
      ) {
        setWsSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goSettings = () => {
    router.push("/dashboard?view=settings");
  };

  return (
    <header
      className="sticky top-0 z-40 h-12 flex items-center border-b px-4 gap-3 shrink-0"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2 shrink-0 rounded-lg pr-2 py-1 hover:bg-white/5 transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold hidden sm:inline">AutoChain</span>
      </Link>

      <div
        className="w-px h-5 shrink-0"
        style={{ background: "var(--border-subtle)" }}
      />

      <div className="relative min-w-0" ref={wsSwitcherRef}>
        <button
          type="button"
          onClick={() => setWsSwitcherOpen(!wsSwitcherOpen)}
          className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg text-sm font-medium transition-colors hover:bg-white/5 max-w-[200px]"
          style={{
            background: wsSwitcherOpen
              ? "rgba(99,102,241,0.08)"
              : "transparent",
            color: "var(--text-primary)",
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: "rgba(99,102,241,0.8)" }}
          >
            {activeWorkspace
              ? activeWorkspace.name.charAt(0).toUpperCase()
              : "?"}
          </div>
          <span className="truncate">
            {activeWorkspace?.name || "No workspace"}
          </span>
          <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
        </button>

        <AnimatePresence>
          {wsSwitcherOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              className="absolute top-full left-0 mt-1.5 w-56 rounded-xl border shadow-2xl overflow-hidden z-50"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="p-1.5">
                <p
                  className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Workspaces
                </p>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setWsSwitcherOpen(false);
                      toast({
                        title: "Switched workspace",
                        description: `Now using "${ws.name}"`,
                        variant: "success",
                      });
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{
                      background:
                        activeWorkspace?.id === ws.id
                          ? "rgba(99,102,241,0.06)"
                          : "transparent",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: "rgba(99,102,241,0.7)" }}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {ws.name}
                      </p>
                      {ws.slug && (
                        <p
                          className="text-[10px] truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {ws.slug}
                        </p>
                      )}
                    </div>
                    {activeWorkspace?.id === ws.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div
                className="border-t p-1.5"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setWsSwitcherOpen(false);
                    openCreateWorkspace();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">New workspace</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Breadcrumb hint on sub-routes */}
      {pathname !== "/dashboard" && !pathname.match(/^\/dashboard\/?$/) && (
        <span
          className="hidden md:inline text-xs truncate ml-2"
          style={{ color: "var(--text-muted)" }}
        >
          {pathname.replace("/dashboard/", "").replace(/-/g, " ")}
        </span>
      )}

      <div className="flex-1 min-w-2" />

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
          title="Dashboard settings"
          onClick={goSettings}
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.clear();
            router.push("/login");
          }}
          className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white ml-1"
          title="Sign out"
        >
          {userName.charAt(0).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
