import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { RefreshCw } from "lucide-react";

/**
 * Chat Model sub-node – connects to the AI Agent's "chatModel" handle.
 * Displays as a circular node with a model icon, matching n8n style.
 */
export default function ChatModelNode({ data, isConnectable }: NodeProps) {
  const label = (data.label as string) || "Chat Model";

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Top handle – connects to AI Agent chatModel handle */}
      <Handle
        type="source"
        position={Position.Top}
        id="model-out"
        className="!w-3 !h-3 !rounded-sm !rotate-45 !border-2"
        style={{
          background: "var(--bg-card, #1e1e2e)",
          borderColor: "var(--border-medium, #555)",
        }}
        isConnectable={isConnectable}
      />

      {/* Circular node body */}
      <div
        className="w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
        style={{
          background: "var(--bg-card, #2a2a3e)",
          borderColor: data.selected ? "#8b5cf6" : "var(--border-medium, #555)",
          boxShadow: data.selected ? "0 0 0 2px rgba(139,92,246,0.25)" : "var(--shadow-card)",
        }}
      >
        <RefreshCw className="w-6 h-6" style={{ color: "var(--text-primary, #fff)" }} />
      </div>

      {/* Label */}
      <span
        className="text-[11px] font-medium text-center max-w-[100px] leading-tight"
        style={{ color: "var(--text-primary, #ccc)" }}
      >
        {label}
      </span>
    </div>
  );
}
