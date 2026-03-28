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
  ChevronsUpDown,
  Check,
  FolderPlus,
  LogOut,
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
        className="flex items-center gap-2.5 shrink-0 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-all duration-300"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shadow-sm bg-primary">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight hidden sm:inline text-primary">AutoChain</span>
      </Link>

      <div
        className="w-[1px] h-6 shrink-0"
        style={{ background: "var(--border-subtle)" }}
      />

      <div className="relative min-w-0" ref={wsSwitcherRef}>
        <button
          type="button"
          onClick={() => setWsSwitcherOpen(!wsSwitcherOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-white/5 max-w-[220px]"
          style={{
            background: wsSwitcherOpen
              ? "color-mix(in srgb, var(--primary) 10%, transparent)"
              : "transparent",
            color: "var(--text-primary)",
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
            style={{ background: "hsl(var(--primary))" }}
          >
            {activeWorkspace
              ? activeWorkspace.name.charAt(0).toUpperCase()
              : "?"}
          </div>
          <span className="truncate">
            {activeWorkspace?.name || "No workspace"}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 shrink-0" />
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
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      background:
                        activeWorkspace?.id === ws.id
                          ? "color-mix(in srgb, hsl(var(--primary)) 8%, transparent)"
                          : "transparent",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: "color-mix(in srgb, hsl(var(--primary)) 80%, transparent)" }}
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
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
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
        <>
          <div className="w-[1px] h-4 shrink-0 mx-1 opacity-50" style={{ background: "var(--border-subtle)" }} />
          <span
            className="hidden md:inline text-[13px] font-medium truncate tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            {pathname.replace("/dashboard/", "").replace(/-/g, " ")}
          </span>
        </>
      )}

      <div className="flex-1 min-w-2" />

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-muted)" }}
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white mx-1 ring-2 ring-transparent transition-all duration-300 hover:ring-primary/50 shadow-sm cursor-pointer"
          style={{ background: "linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--accent)))" }}
          title={userName}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("autochain-auth-token");
            localStorage.removeItem("user");
            document.cookie =
              "autochain-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
            router.push("/login");
          }}
          className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
          style={{ color: "var(--text-muted)" }}
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
