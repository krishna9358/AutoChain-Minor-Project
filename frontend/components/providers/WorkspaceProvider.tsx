"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, workspaceApi, type Workspace, ensureDevToken } from "@/lib/api";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (ws: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  hasWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  error: null,
  setActiveWorkspace: () => {},
  refreshWorkspaces: async () => {},
  hasWorkspace: false,
});

const ACTIVE_WS_KEY = "autochain-active-workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    try {
      setError(null);
      ensureDevToken();

      let list = await workspaceApi.listWorkspaces();

      // In dev mode, if no workspaces exist, trigger bootstrap to create Personal workspace
      if (list.length === 0 && IS_DEV) {
        try {
          await api.get("/api/v1/user/dev-bootstrap");
          list = await workspaceApi.listWorkspaces();
        } catch {
          // bootstrap failed, continue with empty list
        }
      }

      setWorkspaces(list);

      if (list.length > 0) {
        const savedId = localStorage.getItem(ACTIVE_WS_KEY);
        const saved = list.find((w) => w.id === savedId);
        const chosen = saved || list[0];
        setActiveWs(chosen);
        // Always sync localStorage so the API interceptor uses the correct ID
        localStorage.setItem(ACTIVE_WS_KEY, chosen.id);
      } else {
        setActiveWs(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces");
      setWorkspaces([]);
      setActiveWs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveWorkspace = useCallback((ws: Workspace) => {
    setActiveWs(ws);
    localStorage.setItem(ACTIVE_WS_KEY, ws.id);
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        error,
        setActiveWorkspace,
        refreshWorkspaces,
        hasWorkspace: workspaces.length > 0,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
