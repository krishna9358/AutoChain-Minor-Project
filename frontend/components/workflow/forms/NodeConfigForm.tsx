import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentConfigField } from "../config/componentCatalog";

interface NodeConfigFormProps {
  nodeType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  fields?: ComponentConfigField[];
}

export const NodeConfigForm: React.FC<NodeConfigFormProps> = ({
  nodeType,
  config,
  onChange,
  fields: providedFields,
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
  };

  const inputBaseClass =
    "w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all";

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const Icon = FieldIcon[field.type] || Type;
        const value = config[field.key] ?? field.defaultValue ?? "";
        const isEmpty = value === "" || value === undefined || value === null;

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
                className={cn(inputBaseClass, isEmpty && "placeholder:opacity-40")}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
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
                  "resize-none leading-relaxed",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
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
                className={cn(inputBaseClass, isEmpty && "placeholder:opacity-40")}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                }}
              />
            )}

            {(field.type === "password") && (
              <PasswordField
                value={value}
                onChange={(v) => updateConfig(field.key, v)}
                placeholder={field.placeholder}
                inputBaseClass={inputBaseClass}
                isEmpty={isEmpty}
              />
            )}

            {field.type === "email" && (
              <input
                type="email"
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={field.placeholder}
                className={cn(inputBaseClass, isEmpty && "placeholder:opacity-40")}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
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
                className={cn(inputBaseClass, isEmpty && "placeholder:opacity-40")}
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.15))",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                }}
              />
            )}

            {field.type === "select" && (
              <div className="relative">
                <select
                  value={value}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  className={cn(inputBaseClass, "appearance-none cursor-pointer pr-8")}
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

function PasswordField({
  value,
  onChange,
  placeholder,
  inputBaseClass,
  isEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputBaseClass: string;
  isEmpty: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={cn(inputBaseClass, "pr-9", isEmpty && "placeholder:opacity-40")}
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
          <EyeOff className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
        ) : (
          <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
        )}
      </button>
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
    typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? ""),
  );
  const [hasError, setHasError] = useState(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const serialized = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "");
    if (serialized !== raw && !document.activeElement?.closest("[data-json-editor]")) {
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
        <p className="text-[10px] text-red-400 mt-1">Invalid JSON — will be saved on valid edit</p>
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
