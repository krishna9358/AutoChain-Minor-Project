import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Bot, CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * AI Agent node with sub-connection handles for Chat Model, Memory, and Tool.
 * The main node has input/output handles on left/right, plus three bottom
 * sub-handles that connect to sub-nodes (ChatModel, Memory, Tool).
 */
export default function AIAgentNode({ data, isConnectable }: NodeProps) {
  const label = (data.label as string) || "AI Agent";
  const isRunning = data.runStatus === "RUNNING";
  const isCompleted = data.runStatus === "COMPLETED";
  const isFailed = data.runStatus === "FAILED";
  const hasIssue = data.hasValidationError === true;
  const isConfigured = Boolean(
    data.config && Object.keys(data.config as Record<string, unknown>).length > 0,
  );

  const borderColor = data.selected
    ? "#10b981"
    : hasIssue
      ? "#f59e0b"
      : isRunning
        ? "#3b82f6"
        : isCompleted
          ? "#10b981"
          : isFailed
            ? "#ef4444"
            : "var(--border-medium)";

  return (
    <div className="flex flex-col items-center" style={{ width: 240 }}>
      {/* ── Main node body ── */}
      <div
        className="rounded-xl border-2 transition-all w-full relative"
        style={{
          background: "var(--bg-card, #1e1e2e)",
          borderColor,
          boxShadow: data.selected
            ? "0 0 0 2px rgba(16,185,129,0.25)"
            : hasIssue
              ? "0 0 0 2px rgba(245,158,11,0.2)"
              : isRunning
                ? "0 0 12px rgba(59,130,246,0.3)"
                : "var(--shadow-card)",
        }}
      >
        {/* Input handle (left) */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-3 !h-3 !border-2 !rounded-full"
          style={{
            background: "hsl(var(--primary))",
            borderColor: "var(--bg-card, #1e1e2e)",
            left: -7,
            top: "50%",
          }}
          isConnectable={isConnectable}
        />

        {/* Output handle (right) */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="!w-3 !h-3 !border-2 !rounded-full"
          style={{
            background: "#6b7280",
            borderColor: "var(--bg-card, #1e1e2e)",
            right: -7,
            top: "50%",
          }}
          isConnectable={isConnectable}
        />

        {/* Node content */}
        <div className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent-500/10">
            <Bot className="w-5 h-5 text-accent-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {label}
            </p>
          </div>
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {isFailed && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {isRunning && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
          {isConfigured && !isCompleted && !isFailed && !isRunning && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
        </div>
      </div>

      {/* ── Sub-connection handles ── */}
      <div className="flex justify-center gap-10 mt-3 w-full">
        {/* Chat Model */}
        <div className="flex flex-col items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Bottom}
            id="chatModel"
            className="!relative !transform-none !w-2.5 !h-2.5 !rounded-full !border-2"
            style={{
              background: "var(--bg-card, #1e1e2e)",
              borderColor: "var(--border-medium, #555)",
            }}
            isConnectable={isConnectable}
          />
          <span className="text-[10px] whitespace-nowrap font-medium" style={{ color: "var(--text-muted, #888)" }}>
            Chat Model<span className="text-red-400">*</span>
          </span>
        </div>

        {/* Memory */}
        <div className="flex flex-col items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Bottom}
            id="memory"
            className="!relative !transform-none !w-2.5 !h-2.5 !rounded-full !border-2"
            style={{
              background: "var(--bg-card, #1e1e2e)",
              borderColor: "var(--border-medium, #555)",
            }}
            isConnectable={isConnectable}
          />
          <span className="text-[10px] whitespace-nowrap font-medium" style={{ color: "var(--text-muted, #888)" }}>
            Memory
          </span>
        </div>

        {/* Tool */}
        <div className="flex flex-col items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Bottom}
            id="tool"
            className="!relative !transform-none !w-2.5 !h-2.5 !rounded-full !border-2"
            style={{
              background: "var(--bg-card, #1e1e2e)",
              borderColor: "var(--border-medium, #555)",
            }}
            isConnectable={isConnectable}
          />
          <span className="text-[10px] whitespace-nowrap font-medium" style={{ color: "var(--text-muted, #888)" }}>
            Tool
          </span>
        </div>
      </div>
    </div>
  );
}
