"use client";

import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

// ─── Types ──────────────────────────────────────────────
export interface Toast {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

// ─── Context ────────────────────────────────────────
interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Provider + Renderer ────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((data: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const nextToasts = [...prev, { ...data, id }];
      // Limit to max 3 visible toasts to prevent overflowing the page
      return nextToasts.slice(-3);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastRenderer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Renderer ────────────────────────────────────────
function ToastRenderer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 max-w-[420px] w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, t.duration || 5000);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  const isDestructive = t.variant === "destructive";
  const isSuccess = t.variant === "success";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="pointer-events-auto"
    >
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-xl ${
          isDestructive
            ? "bg-red-950/90 border-red-500/30 text-red-100"
            : isSuccess
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100"
              : "bg-zinc-900/90 border-zinc-700/50 text-zinc-100"
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isDestructive ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Info className="w-4 h-4 text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{t.title}</p>
          {t.description && (
            <p className="text-xs mt-1 opacity-80 leading-relaxed">
              {t.description}
            </p>
          )}
          {t.action && <div className="mt-2">{t.action}</div>}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Hook ────────────────────────────────────────
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
