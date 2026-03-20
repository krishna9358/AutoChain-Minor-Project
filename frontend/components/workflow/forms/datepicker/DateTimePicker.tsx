import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: "date" | "time" | "datetime";
  className?: string;
  preferredSide?: "auto" | "left" | "right";
  showSeconds?: boolean;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date and time",
  mode = "datetime",
  className,
  preferredSide = "auto",
  showSeconds = false,
  minDate,
  maxDate,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 320,
  });

  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return placeholder;

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    if (mode === "time" || mode === "datetime") {
      options.hour = "numeric";
      options.minute = "2-digit";
      if (showSeconds) {
        options.second = "2-digit";
      }
    }

    return date.toLocaleString(undefined, options);
  };

  const formatISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    if (mode === "date") {
      return `${year}-${month}-${day}`;
    } else if (mode === "time") {
      return `${hours}:${minutes}${showSeconds ? `:${seconds}` : ""}`;
    } else {
      return `${year}-${month}-${day}T${hours}:${minutes}${showSeconds ? `:${seconds}` : ""}`;
    }
  };

  const commitChange = () => {
    if (selectedDate) {
      const isoString = formatISODate(selectedDate);
      onChange(isoString);
    } else {
      onChange("");
    }
  };

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      const clickedButton = buttonRef.current?.contains(target);
      if (!clickedInsideDropdown && !clickedButton) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const desiredWidth = 320;
      const estimatedHeight = 460;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 6;

      let top = rect.top;
      if (top + estimatedHeight > vh - 12) {
        top = Math.max(12, vh - estimatedHeight - 12);
      }

      const spaceLeft = rect.left - gap;
      const spaceRight = vw - rect.right - gap;
      const wantsLeft =
        preferredSide === "left" ||
        (preferredSide === "auto" && rect.right > vw * 0.55);

      let left: number;
      if (wantsLeft && spaceLeft >= desiredWidth) {
        left = rect.left - desiredWidth - gap;
      } else if (spaceRight >= desiredWidth) {
        left = rect.right + gap;
      } else {
        left = Math.max(12, rect.left - desiredWidth - gap);
      }

      setDropdownPosition({
        top,
        left: Math.max(12, left),
        width: Math.min(desiredWidth, vw - 24),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, preferredSide]);

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (delta: number) => {
    const newDate = new Date(selectedDate || new Date());
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  const navigateYear = (delta: number) => {
    const newDate = new Date(selectedDate || new Date());
    newDate.setFullYear(newDate.getFullYear() + delta);
    setSelectedDate(newDate);
  };

  const selectDate = (day: number, month: number, year: number) => {
    const current = selectedDate || new Date();
    const newDate = new Date(year, month, day);
    newDate.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), 0);
    setSelectedDate(newDate);
  };

  const isSelectedDate = (
    day: number,
    month: number,
    year: number,
  ): boolean => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const isToday = (day: number, month: number, year: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isDisabledDate = (
    day: number,
    month: number,
    year: number,
  ): boolean => {
    const date = new Date(year, month, day);

    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }

    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }

    return false;
  };

  const handleNativeTimeChange = (timeValue: string) => {
    if (!timeValue) return;
    const parts = timeValue.split(":").map((p) => Number.parseInt(p, 10));
    if (parts.some(Number.isNaN)) return;
    const [hours = 0, minutes = 0, seconds = 0] = parts;
    const newDate = new Date(selectedDate || new Date());
    newDate.setHours(hours, minutes, showSeconds ? seconds : 0, 0);
    setSelectedDate(newDate);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange("");
    setIsOpen(false);
  };

  const displayDate = selectedDate || new Date();
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(displayDate);
    const firstDay = getFirstDayOfMonth(displayDate);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [displayDate]);

  const nativeTimeValue = useMemo(() => {
    const d = selectedDate || new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }, [selectedDate, showSeconds]);

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
          "focus-within:ring-2 focus-within:ring-indigo-500/40",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        style={{
          background: "var(--input-bg, rgba(0,0,0,0.15))",
          border: `1px solid ${isOpen ? "var(--border-strong)" : "var(--border-medium)"}`,
        }}
      >
        <Calendar className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <span
          className="flex-1 text-sm"
          style={{
            color: value ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          {formatDisplayDate(selectedDate)}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed rounded-xl shadow-2xl z-[9999] overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxWidth: "min(96vw, 420px)",
              background: "var(--bg-card, #12141d)",
              border: `1px solid var(--border-medium)`,
            }}
          >
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateYear(-1)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {displayDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={() => navigateYear(1)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {mode !== "time" && (
              <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium py-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const currentMonth = displayDate.getMonth();
                const currentYear = displayDate.getFullYear();
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      day !== null &&
                      !isDisabledDate(day, currentMonth, currentYear) &&
                      selectDate(day, currentMonth, currentYear)
                    }
                    disabled={
                      !day || isDisabledDate(day, currentMonth, currentYear)
                    }
                    className={cn(
                      "w-9 h-9 rounded-md text-sm font-medium transition-all",
                      "flex items-center justify-center",
                      "hover:bg-white/10",
                      "disabled:opacity-30 disabled:cursor-not-allowed",
                    )}
                    style={{
                      background: isSelectedDate(
                        day || 0,
                        currentMonth,
                        currentYear,
                      )
                        ? "var(--accent-primary, #6366f1)"
                        : "transparent",
                      color: isSelectedDate(day || 0, currentMonth, currentYear)
                        ? "white"
                        : isToday(day || 0, currentMonth, currentYear)
                          ? "var(--accent-primary, #6366f1)"
                          : "var(--text-primary)",
                      fontWeight:
                        isSelectedDate(day || 0, currentMonth, currentYear) ||
                        isToday(day || 0, currentMonth, currentYear)
                          ? 600
                          : 400,
                    }}
                  >
                    {day ?? ""}
                  </button>
                );
              })}
            </div>
              </>
            )}

            {mode !== "time" && (
              <div
                className="mt-3 pt-2.5 border-t flex justify-between"
                style={{ borderColor: "var(--border-subtle)" }}
              >
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(new Date(today));
                  onChange(formatISODate(today));
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover:bg-white/10"
                style={{ color: "var(--text-primary)" }}
              >
                Today
              </button>
              </div>
            )}

            {(mode === "time" || mode === "datetime") && (
              <div
                className="mt-3 pt-2.5 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <label
                    className="text-[11px] shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Time
                  </label>
                  <input
                    type="time"
                    value={nativeTimeValue}
                    step={showSeconds ? 1 : 60}
                    onChange={(e) => handleNativeTimeChange(e.target.value)}
                    className="w-full h-9 rounded-md px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{
                      background: "var(--input-bg, rgba(0,0,0,0.2))",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-medium)",
                    }}
                  />
                </div>

                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const newDate = new Date(displayDate);
                      newDate.setHours(now.getHours());
                      newDate.setMinutes(now.getMinutes());
                      newDate.setSeconds(showSeconds ? now.getSeconds() : 0);
                      setSelectedDate(newDate);
                      onChange(formatISODate(newDate));
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors hover:bg-white/10"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Use current time
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className="px-3.5 py-2.5 border-t flex justify-end gap-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-md transition-colors hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                commitChange();
                setIsOpen(false);
              }}
              className="px-4 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
              style={{
                background: "var(--accent-primary)",
                color: "white",
              }}
            >
              <Check className="w-3 h-3" />
              Apply
            </button>
          </div>
        </div>,
          document.body,
        )}
      </div>
  );
};
