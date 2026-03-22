import { WebSocket } from "ws";

let clients: Set<WebSocket> = new Set();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
}

export function broadcastRunUpdate(data: {
  type:
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "step_fallback"
    | "run_completed"
    | "run_failed";
  runId: string;
  nodeId?: string;
  nodeLabel?: string;
  status?: string;
  executionTimeMs?: number;
  error?: string;
  reasoningSummary?: string;
  timestamp: string;
}) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
