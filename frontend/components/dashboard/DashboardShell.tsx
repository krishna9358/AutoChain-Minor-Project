"use client";

import type { ReactNode } from "react";
import { DashboardUIProvider } from "@/components/dashboard/DashboardUIProvider";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardUIProvider>
      <div
        className="min-h-screen flex"
        style={{ background: "var(--bg-primary)" }}
      >
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <DashboardTopBar />
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </DashboardUIProvider>
  );
}
