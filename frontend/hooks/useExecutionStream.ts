import { useEffect, useRef, useCallback, useState } from "react";

interface StepUpdate {
  type:
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "step_fallback"
    | "run_completed"
    | "run_failed"
    | "connected";
  runId: string;
  nodeId?: string;
  nodeLabel?: string;
  status?: string;
  executionTimeMs?: number;
  error?: string;
  reasoningSummary?: string;
  timestamp: string;
}

export function useExecutionStream(runId: string | null) {
  const [updates, setUpdates] = useState<StepUpdate[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Derive WS URL from backend URL
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    const wsUrl = backendUrl.replace(/^http/, "ws") + "/ws";

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data: StepUpdate = JSON.parse(event.data);

        // Only process updates for the current run
        if (runId && data.runId && data.runId !== runId) return;

        setUpdates((prev) => [...prev, data]);

        if (data.type === "step_started") {
          setActiveNodeId(data.nodeId || null);
        } else if (
          data.type === "step_completed" ||
          data.type === "step_failed"
        ) {
          setActiveNodeId(null);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [runId]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setActiveNodeId(null);
  }, []);

  return { updates, activeNodeId, connected, clearUpdates };
}
