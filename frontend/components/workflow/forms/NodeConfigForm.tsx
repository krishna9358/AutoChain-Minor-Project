import React, { useState } from "react";
import {
  Type,
  Textarea as TextareaIcon,
  Hash,
  ToggleLeft,
  Lock,
  Mail,
  Globe,
  ChevronDown,
  HelpCircle,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentConfigField } from "../config/componentCatalog";

// NodeConfigForm component for rendering node-specific configuration fields
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
    select: Hash,
    number: Type,
    boolean: ToggleLeft,
    password: Lock,
    json: Type,
    "api-key": Lock,
    email: Mail,
    url: Globe,
    "multi-select": Hash,
    code: Type,
  };

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
                className="text-xs font-medium flex items-center space-x-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                <Icon className="w-3 h-3" />
                <span>
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </span>
              </span>
              {field.description && (
                <HelpCircle
                  className="w-3 h-3 opacity-50 cursor-help"
                  title={field.description}
                />
              )}
            </label>

            {field.type === "text" && (
              <input
                type="text"
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg)",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                }}
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows || 3}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg)",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                }}
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  updateConfig(field.key, parseFloat(e.target.value))
                }
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg)",
                  border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                  color: "var(--text-primary)",
                }}
              />
            )}

            {field.type === "password" ||
              (field.type === "api-key" && (
                <div className="relative">
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={cn(
                      "w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all pr-8",
                      isEmpty && "placeholder:opacity-40",
                    )}
                    style={{
                      background: "var(--input-bg)",
                      border: `1px solid ${isEmpty ? "var(--border-subtle)" : "var(--border-medium)"}`,
                      color: "var(--text-primary)",
                    }}
                  />
                  {!isEmpty && (
                    <Lock
                      className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    />
                  )}
                </div>
              ))}

            {field.type === "email" && (
              <input
                type="email"
                value={value}
                onChange={(e) => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg)",
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
                placeholder={field.placeholder}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all",
                  isEmpty && "placeholder:opacity-40",
                )}
                style={{
                  background: "var(--input-bg)",
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
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer transition-all"
                  style={{
                    background: "var(--input-bg)",
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
                onClick={() => updateConfig(field.key, !value)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-2 border",
                  value
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-transparent border-gray-300 text-gray-500 hover:border-gray-400",
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    value ? "bg-emerald-500" : "bg-gray-300",
                  )}
                />
                <span>{value ? "Enabled" : "Disabled"}</span>
              </button>
            )}

            {field.type === "json" && (
              <textarea
                value={
                  typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : value
                }
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateConfig(field.key, parsed);
                  } catch {
                    updateConfig(field.key, e.target.value);
                  }
                }}
                placeholder={field.placeholder}
                rows={field.rows || 4}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all"
                style={{
                  background: "var(--code-bg)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
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
                className="text-[10px] mt-1 flex items-start space-x-1"
                style={{ color: "var(--text-muted)" }}
              >
                <HelpCircle className="w-3 h-3 mt-0.5 shrink-0 opacity-50" />
                <span>{field.description}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// MultiSelect component for selecting multiple options
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
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer min-h-[36px] transition-all flex flex-wrap gap-1.5 items-center"
        style={{
          background: "var(--input-bg)",
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
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors hover:bg-opacity-80"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
              onClick={(e) => handleRemove(option.value, e)}
            >
              <span>{option.label}</span>
              <X className="w-3 h-3 hover:text-red-500" />
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
          className="absolute z-10 w-full mt-1 rounded-lg border shadow-xl overflow-hidden max-h-48 overflow-y-auto"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <input
            type="text"
            placeholder="Search options..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2.5 py-1.5 text-xs border-b focus:outline-none"
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
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors",
                    "hover:bg-opacity-50",
                  )}
                  style={{
                    color: "var(--text-primary)",
                    background: isSelected
                      ? "rgba(99,102,241,0.05)"
                      : "transparent",
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ background: "rgba(16,185,129,0.1)" }}
                    >
                      <Plus className="w-3 h-3 text-emerald-500" />
                    </div>
                  )}
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div
                className="px-2.5 py-3 text-xs text-center"
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
