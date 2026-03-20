import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Type,
  AlignLeft as TextareaIcon,
  Hash,
  ToggleLeft,
  Lock,
  Mail,
  Globe,
  ChevronDown,
  HelpCircle,
  Plus,
  X,
  Eye,
  EyeOff,
  Code,
  List,
  Link2,
  RefreshCw,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentConfigField } from "../config/componentCatalog";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";
import {
  datetimeLocalToIso,
  isoToDatetimeLocalValue,
} from "@/lib/workflow-datetime";
import { SecretSelector } from "./SecretSelector";
import { DateTimePicker } from "./datepicker/DateTimePicker";

interface NodeConfigFormProps {
  nodeType: string;
  fields: ComponentConfigField[];
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  errors?: string[];
  /** Required for **google-account** fields (OAuth connection picker). */
  workspaceId?: string;
}

export const NodeConfigForm: React.FC<NodeConfigFormProps> = ({
  nodeType,
  config,
  onChange,
  fields: providedFields,
  errors,
  workspaceId = "",
}) => {
  const fields: ComponentConfigField[] = providedFields || [];

  if (fields.length === 0) {
    return (
      <div
        className="p-4 text-center text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        <HelpCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
        No configuration required for this node
      </div>
    );
  }

  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const FieldIcon: Record<string, React.ElementType> = {
    text: Type,
    textarea: TextareaIcon,
    select: List,
    number: Hash,
    boolean: ToggleLeft,
    password: Lock,
    json: Code,
    email: Mail,
    url: Globe,
    "multi-select": Hash,
    "api-key": Lock,
    "google-account": Link2,
    datetime: CalendarClock,
  };

  const inputBaseClass =
    "w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all";

  // Filter fields based on showWhen conditions
  const visibleFields = fields.filter((field) => {
    if (!field.showWhen) return true;
    const depValue = config[field.showWhen.field] ?? "";
    if (Array.isArray(field.showWhen.value)) {
      return field.showWhen.value.includes(depValue);
    }
    return depValue === field.showWhen.value;
  });

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => {
        const Icon = FieldIcon[field.type] || Type;
        const value = config[field.key] ?? field.defaultValue ?? "";
        const isEmpty = value === "" || value === undefined || value === null;
        const fieldErrors = (errors || []).filter((e) =>
          e.startsWith(`${field.key}:`),
        );

        return (
          <div key={field.key} className="space-y-1.5">
            <label className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold flex items-center gap-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                <Icon className="w-3 h-3 opacity-60" />
                <span>
                  {field.label}
                  {field.required && (
                    <span className="text-red-400 ml-0.5">*</span>
                  )}
                </span>
              </span>
            </label>

            {field.type === "text" && (
              <input
                type="text"
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={field.placeholder}
                className={cn(
                  inputBaseClass,
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                  borderColor: fieldErrors.length > 0 ? "#ef4444" : undefined,
                }}
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={field.placeholder}
                rows={field.rows || 3}
                className={cn(
                  inputBaseClass,
                  "resize-y min-h-[4.5rem] leading-relaxed",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                  borderColor: fieldErrors.length > 0 ? "#ef4444" : undefined,
                }}
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={value === "" || value === undefined ? "" : value}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    updateConfig(field.key, "");
                  } else {
                    const num = parseFloat(raw);
                    if (!isNaN(num)) updateConfig(field.key, num);
                  }
                }}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                step={field.max && field.max <= 2 ? 0.1 : 1}
                className={cn(
                  inputBaseClass,
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                  borderColor: fieldErrors.length > 0 ? "#ef4444" : undefined,
                }}
              />
            )}

            {(field.type === "password" || field.type === "api-key") && (
              <PasswordField
                value={value}
                onChange={(v) => updateConfig(field.key, v)}
                placeholder={field.placeholder}
                inputBaseClass={inputBaseClass}
                isEmpty={isEmpty}
                workspaceId={workspaceId}
              />
            )}

            {field.type === "email" && (
              <input
                type="email"
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={field.placeholder}
                className={cn(
                  inputBaseClass,
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                  borderColor: fieldErrors.length > 0 ? "#ef4444" : undefined,
                }}
              />
            )}

            {field.type === "url" && (
              <input
                type="url"
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={field.placeholder}
                className={cn(
                  inputBaseClass,
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                  borderColor: fieldErrors.length > 0 ? "#ef4444" : undefined,
                }}
              />
            )}

            {field.type === "select" && (
              <div className="relative">
                <select
                  value={value}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  className={cn(
                    inputBaseClass,
                    "appearance-none cursor-pointer pr-8",
                  )}
                  style={{
                    background: "var(--input-bg, rgba(0,0,0,0.15))",
                    border: "1px solid var(--border-medium)",
                    color: "var(--text-primary)",
                  }}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-muted)" }}
                />
              </div>
            )}

            {field.type === "google-account" && (
              <GoogleAccountField
                workspaceId={workspaceId}
                value={typeof value === "string" ? value : ""}
                onChange={(v) => updateConfig(field.key, v)}
                hasError={fieldErrors.length > 0}
                inputBaseClass={inputBaseClass}
              />
            )}

            {field.type === "datetime" && (
              <DateTimePicker
                value={value}
                onChange={(v) => updateConfig(field.key, v)}
                placeholder={field.placeholder || "Select date and time"}
                mode="datetime"
                preferredSide="left"
                showSeconds={field.showSeconds ?? false}
                minDate={field.minDate}
                maxDate={field.maxDate}
                className={cn(fieldErrors.length > 0 && "border-red-500")}
              />
            )}

            {field.type === "boolean" && (
              <button
                type="button"
                onClick={() => updateConfig(field.key, !value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between border",
                  value
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "border-gray-600 text-gray-400 hover:border-gray-500",
                )}
              >
                <span>{value ? "Enabled" : "Disabled"}</span>
                <div
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors",
                    value ? "bg-emerald-500" : "bg-gray-600",
                  )}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all",
                      value ? "left-[18px]" : "left-[2px]",
                    )}
                  />
                </div>
              </button>
            )}

            {field.type === "json" && (
              <JsonEditor
                value={value}
                onChange={(v) => updateConfig(field.key, v)}
                placeholder={field.placeholder}
                rows={field.rows || 4}
              />
            )}

            {field.type === "multi-select" && (
              <MultiSelect
                value={Array.isArray(value) ? value : []}
                onChange={(v) => updateConfig(field.key, v)}
                options={field.options || []}
                placeholder={field.placeholder || "Select options..."}
              />
            )}

            {fieldErrors.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                {fieldErrors[0].split(": ").slice(1).join(": ")}
              </p>
            )}

            {field.description && (
              <p
                className="text-[10px] leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {field.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

function GoogleAccountField({
  workspaceId,
  value,
  onChange,
  hasError,
  inputBaseClass,
}: {
  workspaceId: string;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
  inputBaseClass: string;
}) {
  const [conns, setConns] = useState<
    { id: string; email?: string | null; displayName?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) {
      setConns([]);
      return;
    }
    setLoading(true);
    setFetchErr(null);
    fetch(
      `${BACKEND_URL}/api/v1/integrations/google/connections?workspaceId=${encodeURIComponent(workspaceId)}`,
      { headers: getAuthHeaders() },
    )
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok)
          throw new Error(
            typeof body.error === "string" ? body.error : r.statusText,
          );
        return body as typeof conns;
      })
      .then(setConns)
      .catch((e: Error) => setFetchErr(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!workspaceId) {
    return (
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        Choose an active workspace (header) to list Google connections.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-stretch">
        <div className="relative flex-1 min-w-0">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={loading}
            className={cn(
              inputBaseClass,
              "appearance-none cursor-pointer pr-8 w-full",
            )}
            style={{
              background: "var(--input-bg, rgba(0,0,0,0.15))",
              border: `1px solid ${hasError ? "#ef4444" : "var(--border-medium)"}`,
              color: "var(--text-primary)",
            }}
          >
            <option value="">— Select connected account —</option>
            {conns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.email || c.displayName || `${c.id.slice(0, 8)}…`}
              </option>
            ))}
          </select>
          <ChevronDown
            className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
        <button
          type="button"
          title="Refresh list"
          onClick={() => load()}
          disabled={loading}
          className="shrink-0 px-2.5 rounded-lg border transition-colors hover:bg-white/5"
          style={{
            borderColor: "var(--border-medium)",
            color: "var(--text-muted)",
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <Link
          href="/dashboard/integrations/google"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          Connect Google account…
        </Link>
        {conns.length === 0 && !loading && !fetchErr && (
          <span style={{ color: "var(--text-muted)" }}>
            No connections yet for this workspace.
          </span>
        )}
      </div>
      {value &&
        !loading &&
        conns.length > 0 &&
        !conns.some((c) => c.id === value) && (
          <p className="text-[10px] text-amber-400/95 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              This node still references an old Google connection (reconnect,
              copy, or DB reset). Pick an account again.
            </span>
            <button
              type="button"
              className="underline font-medium text-amber-300"
              onClick={() => onChange("")}
            >
              Clear selection
            </button>
          </p>
        )}
      {fetchErr && <p className="text-[10px] text-red-400">{fetchErr}</p>}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  inputBaseClass,
  isEmpty,
  workspaceId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputBaseClass: string;
  isEmpty: boolean;
  workspaceId?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={placeholder}
          className={cn(
            inputBaseClass,
            "pr-9",
            isEmpty && "placeholder:opacity-40",
          )}
          style={{
            background: "var(--input-bg, rgba(0,0,0,0.15))",
            border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
        >
          {visible ? (
            <EyeOff
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-muted)" }}
            />
          ) : (
            <Eye
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-muted)" }}
            />
          )}
        </button>
      </div>
      {workspaceId && (
        <SecretSelector
          workspaceId={workspaceId}
          preferredSide="left"
          onSelect={(secretRef) => {
            // If field is empty, just set the secret reference
            // If field has content, append it (or replace if user wants)
            if (!value || value.startsWith("{{secrets.")) {
              onChange(secretRef);
            } else {
              // Ask user or just append? For now, let's append with a space
              onChange(value + " " + secretRef);
            }
          }}
        />
      )}
    </div>
  );
}

function JsonEditor({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
  rows: number;
}) {
  const [raw, setRaw] = useState(() =>
    typeof value === "object"
      ? JSON.stringify(value, null, 2)
      : String(value ?? ""),
  );
  const [hasError, setHasError] = useState(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const serialized =
      typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value ?? "");
    if (
      serialized !== raw &&
      !document.activeElement?.closest("[data-json-editor]")
    ) {
      setRaw(serialized);
      setHasError(false);
    }
  }, [value]);

  const handleChange = (text: string) => {
    setRaw(text);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(text);
        onChange(parsed);
        setHasError(false);
      } catch {
        setHasError(true);
      }
    }, 600);
  };

  const handleBlur = () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    try {
      const parsed = JSON.parse(raw);
      onChange(parsed);
      setRaw(JSON.stringify(parsed, null, 2));
      setHasError(false);
    } catch {
      setHasError(true);
    }
  };

  return (
    <div data-json-editor>
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className={cn(
          "w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 transition-all resize-none leading-relaxed",
          hasError
            ? "focus:ring-red-500/40 border-red-500/50"
            : "focus:ring-indigo-500/40",
        )}
        style={{
          background: "var(--code-bg, rgba(0,0,0,0.2))",
          border: `1px solid ${hasError ? "rgba(239,68,68,0.4)" : "var(--border-subtle)"}`,
          color: "var(--text-secondary)",
        }}
      />
      {hasError && (
        <p className="text-[10px] text-red-400 mt-1">
          Invalid JSON — will be saved on valid edit
        </p>
      )}
    </div>
  );
}

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg text-xs cursor-pointer min-h-[36px] transition-all flex flex-wrap gap-1.5 items-center"
        style={{
          background: "var(--input-bg, rgba(0,0,0,0.15))",
          border:
            value.length > 0
              ? "1px solid var(--border-medium)"
              : "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
        }}
      >
        {selectedOptions.length === 0 ? (
          <span style={{ color: "var(--text-muted)" }}>{placeholder}</span>
        ) : (
          selectedOptions.map((option) => (
            <span
              key={option.value}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
              onClick={(e) => handleRemove(option.value, e)}
            >
              <span>{option.label}</span>
              <X className="w-2.5 h-2.5 hover:text-red-400" />
            </span>
          ))
        )}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 ml-auto transition-transform",
            isOpen && "rotate-180",
          )}
          style={{ color: "var(--text-muted)" }}
        />
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border shadow-xl overflow-hidden max-h-48 overflow-y-auto"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 text-xs border-b focus:outline-none"
            style={{
              background: "var(--bg-hover)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <div>
            {filteredOptions.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors hover:bg-white/5"
                  style={{
                    color: "var(--text-primary)",
                    background: isSelected
                      ? "rgba(99,102,241,0.08)"
                      : "transparent",
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded bg-indigo-500/20 flex items-center justify-center">
                      <Plus className="w-2.5 h-2.5 text-indigo-400 rotate-45" />
                    </div>
                  )}
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div
                className="px-3 py-3 text-xs text-center"
                style={{ color: "var(--text-muted)" }}
              >
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
