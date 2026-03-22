"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

/**
 * Autosave hook that watches the workflow store for dirty changes
 * and calls the provided save function after a debounce period.
 *
 * @param saveFn  - async function that performs the actual save
 * @param enabled - whether autosave is active (disable for new unsaved workflows)
 * @param delayMs - debounce delay in milliseconds (default 3000)
 */
export function useAutosave(
  saveFn: () => Promise<void>,
  enabled: boolean,
  delayMs = 3000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  useEffect(() => {
    if (!enabled) return;

    let prevNodes = useWorkflowStore.getState().nodes;
    let prevEdges = useWorkflowStore.getState().edges;

    const unsub = useWorkflowStore.subscribe((state) => {
      const { isDirty, nodes, edges } = state;

      // Only react when nodes/edges actually changed and store is dirty
      if (!isDirty || (nodes === prevNodes && edges === prevEdges)) return;

      prevNodes = nodes;
      prevEdges = edges;

      // Clear any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Schedule a new save
      timerRef.current = setTimeout(() => {
        saveFnRef.current().catch((err) => {
          console.error("Autosave failed:", err);
        });
      }, delayMs);
    });

    return () => {
      unsub();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, delayMs]);
}
