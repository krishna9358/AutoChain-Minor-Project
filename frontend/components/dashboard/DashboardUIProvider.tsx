"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

type DashboardUIContextValue = {
  openCreateWorkspace: () => void;
};

const DashboardUIContext = createContext<DashboardUIContextValue | null>(null);

export function useDashboardUI() {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) {
    throw new Error("useDashboardUI must be used within DashboardUIProvider");
  }
  return ctx;
}

export function DashboardUIProvider({ children }: { children: ReactNode }) {
  const { refreshWorkspaces } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  const openCreateWorkspace = useCallback(() => setCreateOpen(true), []);

  const value = useMemo(
    () => ({ openCreateWorkspace }),
    [openCreateWorkspace],
  );

  return (
    <DashboardUIContext.Provider value={value}>
      {children}
      <CreateWorkspaceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refreshWorkspaces()}
      />
    </DashboardUIContext.Provider>
  );
}
