"use client";

import { motion } from "framer-motion";
import {
  Zap as TriggerIcon,
  ArrowRight,
  CheckCircle,
  Clock,
  PlayCircle,
  MoreVertical,
  Settings,
} from "lucide-react";

export const ZapCell = ({
  name,
  index,
  onClick,
  selected = false,
  configured = false,
  type = "action",
  status = "idle",
}: {
  name?: string;
  index: number;
  onClick: () => void;
  selected?: boolean;
  configured?: boolean;
  type?: "trigger" | "action";
  status?: "idle" | "loading" | "success" | "error";
}) => {
  const isTrigger = type === "trigger";
  const displayName = name || (isTrigger ? "Select Trigger" : "Select Action");
  const isEmpty = !name;

  const baseStyles =
    "w-[350px] rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group";

  const variantStyles = {
    idle: isEmpty
      ? "border-slate-300 bg-white hover:border-primary-400 hover:shadow-glow"
      : "border-slate-200 bg-white hover:border-primary-400 hover:shadow-medium",
    selected: "border-primary-500 bg-primary-50/50 shadow-glow",
    loading: "border-blue-300 bg-blue-50/50",
    success: "border-emerald-400 bg-emerald-50/50",
    error: "border-red-400 bg-red-50/50",
  };

  const getStatusIcon = () => {
    if (status === "loading") {
      return (
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      );
    }
    if (status === "success") {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    if (status === "error") {
      return <Clock className="w-5 h-5 text-red-500" />;
    }
    if (configured) {
      return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    }
    if (isEmpty) {
      return isTrigger ? (
        <PlayCircle className="w-5 h-5 text-slate-400" />
      ) : (
        <Settings className="w-5 h-5 text-slate-400" />
      );
    }
    return (
      <MoreVertical className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  };

  const getIconBackground = () => {
    if (isEmpty) {
      return "bg-slate-100";
    }
    if (isTrigger) {
      return "bg-primary";
    }
    return "bg-primary";
  };

  const getIcon = () => {
    if (isTrigger) {
      return <TriggerIcon className="w-5 h-5 text-white" />;
    }
    return <ArrowRight className="w-5 h-5 text-white" />;
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: isEmpty ? 1.02 : 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variantStyles[status === "idle" && selected ? "selected" : status]}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      {/* Animated gradient border effect */}
      {!isEmpty && (
        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:animate-shimmer" />
      )}

      {/* Content */}
      <div className="p-6 relative z-10">
        <div className="flex items-center gap-4">
          {/* Index Badge */}
          <div
            className={`
            w-12 h-12 rounded-xl ${getIconBackground()} flex items-center justify-center
            transition-all duration-300 group-hover:scale-110 shadow-md
          `}
          >
            {getIcon()}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`
                text-lg font-bold ${isEmpty ? "text-slate-400" : "text-slate-800"}
                transition-colors duration-200
              `}
              >
                {index}. {displayName}
              </div>
            </div>

            {/* Subtitle/Status */}
            <div className="flex items-center gap-2">
              {isTrigger && (
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full font-medium">
                  Trigger
                </span>
              )}
              {!isTrigger && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
                  Action
                </span>
              )}

              {configured && !isEmpty && (
                <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full font-medium">
                  Configured
                </span>
              )}

              {isEmpty && (
                <span className="text-xs text-slate-400">
                  Click to {isTrigger ? "select" : "add"} {type}
                </span>
              )}
            </div>
          </div>

          {/* Status/Action Icon */}
          <div className="flex items-center justify-center transition-all duration-300">
            {getStatusIcon()}
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      {selected && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          className="absolute bottom-0 left-0 h-1 bg-primary"
        />
      )}

      {/* Hover glow effect */}
      <div
        className={`
        absolute inset-0 bg-primary opacity-0 group-hover:opacity-5
        transition-opacity duration-300 pointer-events-none
      `}
      />
    </motion.div>
  );
};

// Enhanced variant with additional metadata display
export const ZapCellWithDetails = ({
  name,
  index,
  onClick,
  selected = false,
  configured = false,
  type = "action",
  status = "idle",
  metadata,
}: {
  name?: string;
  index: number;
  onClick: () => void;
  selected?: boolean;
  configured?: boolean;
  type?: "trigger" | "action";
  status?: "idle" | "loading" | "success" | "error";
  metadata?: {
    description?: string;
    lastRun?: string;
    runs?: number;
  };
}) => {
  return (
    <div className="relative">
      <ZapCell
        name={name}
        index={index}
        onClick={onClick}
        selected={selected}
        configured={configured}
        type={type}
        status={status}
      />

      {/* Metadata Panel */}
      {configured && metadata && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 mx-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
        >
          {metadata.description && (
            <p className="text-slate-600 mb-2">{metadata.description}</p>
          )}
          <div className="flex gap-4 text-xs text-slate-500">
            {metadata.lastRun && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last: {metadata.lastRun}
              </span>
            )}
            {metadata.runs !== undefined && (
              <span className="flex items-center gap-1">
                <PlayCircle className="w-3 h-3" />
                {metadata.runs} runs
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Compact version for dense layouts
export const CompactZapCell = ({
  name,
  index,
  onClick,
  selected = false,
  configured = false,
  type = "action",
}: {
  name?: string;
  index: number;
  onClick: () => void;
  selected?: boolean;
  configured?: boolean;
  type?: "trigger" | "action";
}) => {
  const isTrigger = type === "trigger";
  const displayName = name || (isTrigger ? "Trigger" : "Action");
  const isEmpty = !name;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        w-[280px] p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        flex items-center gap-3 relative overflow-hidden group
        ${
          selected
            ? "border-primary-500 bg-primary-50/50 shadow-glow"
            : isEmpty
              ? "border-slate-300 bg-white hover:border-primary-400"
              : "border-slate-200 bg-white hover:border-primary-400 hover:shadow-soft"
        }
      `}
    >
      <div
        className={`
        w-10 h-10 rounded-lg ${isEmpty ? "bg-slate-100" : "bg-primary"}
        flex items-center justify-center transition-all duration-300 group-hover:scale-110
      `}
      >
        {isTrigger ? (
          <TriggerIcon className="w-4 h-4 text-white" />
        ) : (
          <ArrowRight className="w-4 h-4 text-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={`
          font-semibold text-sm truncate ${isEmpty ? "text-slate-400" : "text-slate-800"}
        `}
        >
          {index}. {displayName}
        </div>
        {configured && !isEmpty && (
          <div className="text-xs text-emerald-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Ready
          </div>
        )}
      </div>

      {configured && !isEmpty && (
        <CheckCircle className="w-5 h-5 text-emerald-400" />
      )}
    </motion.div>
  );
};
