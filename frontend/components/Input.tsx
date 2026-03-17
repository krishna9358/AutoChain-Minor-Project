"use client";

import { ReactNode } from "react";

export const Input = ({
  label,
  placeholder,
  onChange,
  type = "text",
  error = "",
  helperText = "",
  icon,
  disabled = false,
  required = false,
}: {
  label: string;
  placeholder: string;
  onChange: (e: any) => void;
  type?: "text" | "password" | "email" | "number";
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  disabled?: boolean;
  required?: boolean;
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5 transition-colors duration-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors duration-200">
            {icon}
          </div>
        )}

        <input
          type={type}
          placeholder={placeholder}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-xl border-2 text-slate-900 placeholder-slate-400
            transition-all duration-300 ease-out
            ${icon ? "pl-10" : "pl-4"}
            ${
              disabled
                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-white hover:border-slate-300 focus:outline-none focus:border-primary-500 focus:shadow-glow"
            }
            ${error ? "border-red-500 focus:border-red-500 focus:shadow-red-200" : "border-slate-200"}
            transform hover:scale-[1.01] focus:scale-[1.02] active:scale-[0.99]
          `}
        />

        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 transition-opacity duration-200">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500 transition-colors duration-200">
          {helperText}
        </p>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced textarea component
export const Textarea = ({
  label,
  placeholder,
  onChange,
  error = "",
  helperText = "",
  disabled = false,
  required = false,
  rows = 4,
}: {
  label: string;
  placeholder: string;
  onChange: (e: any) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5 transition-colors duration-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <textarea
        rows={rows}
        placeholder={placeholder}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-xl border-2 text-slate-900 placeholder-slate-400 resize-none
          transition-all duration-300 ease-out
          ${
            disabled
              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-white hover:border-slate-300 focus:outline-none focus:border-primary-500 focus:shadow-glow"
          }
          ${error ? "border-red-500 focus:border-red-500 focus:shadow-red-200" : "border-slate-200"}
          transform hover:scale-[1.005] focus:scale-[1.01] active:scale-[0.995]
        `}
      />

      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500 transition-colors duration-200">
          {helperText}
        </p>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
};
