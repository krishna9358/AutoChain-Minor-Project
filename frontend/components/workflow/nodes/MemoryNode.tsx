import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";

/**
 * Memory sub-node – connects to the AI Agent's "memory" handle.
 * Provides conversation history, vector memory, etc.
 */
export default function MemoryNode({ data, isConnectable }: NodeProps) {
  const label = (data.label as string) || "Memory";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Handle
        type="source"
        position={Position.Top}
        id="memory-out"
        className="!w-3 !h-3 !rounded-sm !rotate-45 !border-2"
        style={{
          background: "var(--bg-card, #1e1e2e)",
          borderColor: "var(--border-medium, #555)",
        }}
        isConnectable={isConnectable}
      />

      <div
        className="w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
        style={{
          background: "var(--bg-card, #2a2a3e)",
          borderColor: data.selected ? "#3b82f6" : "var(--border-medium, #555)",
          boxShadow: data.selected ? "0 0 0 2px rgba(59,130,246,0.25)" : "var(--shadow-card)",
        }}
      >
        <Database className="w-6 h-6" style={{ color: "var(--text-primary, #fff)" }} />
      </div>

      <span
        className="text-[11px] font-medium text-center max-w-[100px] leading-tight"
        style={{ color: "var(--text-primary, #ccc)" }}
      >
        {label}
      </span>
    </div>
  );
}
