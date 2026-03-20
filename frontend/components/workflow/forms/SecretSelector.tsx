import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Lock, Key, ChevronDown, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";

interface Secret {
  id: string;
  name: string;
  key: string; // Reference name (e.g., STRIPE_API_KEY)
  value: string;
  type: string;
  description?: string;
}

interface SecretSelectorProps {
  onSelect: (reference: string) => void; // Will insert {{secrets.KEY}}
  workspaceId?: string;
  className?: string;
  preferredSide?: "auto" | "left" | "right";
}

export const SecretSelector: React.FC<SecretSelectorProps> = ({
  onSelect,
  workspaceId,
  className,
  preferredSide = "auto",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 360,
  });

  // Fetch secrets from backend
  const loadSecrets = useCallback(async () => {
    if (!workspaceId) {
      setError("Workspace ID is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${BACKEND_URL}/api/v1/secrets?workspaceId=${workspaceId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to load secrets");
      }

      const data = await res.json();
      setSecrets(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load secrets");
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Load secrets when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadSecrets();
    }
  }, [isOpen, loadSecrets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const desiredWidth = 340;
      const estimatedHeight = 380;
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

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      const clickedButton = buttonRef.current?.contains(target);
      if (
        !clickedInsideDropdown &&
        !clickedButton
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, preferredSide]);

  // Filter secrets based on search query
  const filteredSecrets = secrets.filter((secret) => {
    const matchesSearch =
      searchQuery === "" ||
      secret.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      secret.key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get icon for secret type
  const getSecretIcon = (type: string) => {
    const iconMap: Record<string, React.ElementType> = {
      API_KEY: Key,
      PASSWORD: Lock,
      TOKEN: Key,
      CERTIFICATE: Lock,
      DATABASE_URL: Lock,
      OTHER: Lock,
    };
    return iconMap[type] || Key;
  };

  // Get color for secret type
  const getSecretColor = (type: string) => {
    const colorMap: Record<string, string> = {
      API_KEY: "text-purple-400",
      PASSWORD: "text-amber-400",
      TOKEN: "text-blue-400",
      CERTIFICATE: "text-green-400",
      DATABASE_URL: "text-pink-400",
      OTHER: "text-gray-400",
    };
    return colorMap[type] || "text-gray-400";
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all hover:bg-white/10"
        style={{
          background: "var(--input-bg, rgba(0,0,0,0.15))",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Lock className="w-3 h-3" />
        <span>Select Secret</span>
        <ChevronDown
          className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
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
              border: "1px solid var(--border-medium)",
            }}
          >
          {/* Header with search and refresh */}
          <div
            className="p-3 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Search secrets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                style={{
                  background: "var(--input-bg, rgba(0,0,0,0.2))",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              />
              <button
                type="button"
                onClick={loadSecrets}
                disabled={loading}
                className="p-2 rounded-md transition-colors hover:bg-white/10 disabled:opacity-50"
                style={{ color: "var(--text-secondary)" }}
                title="Refresh secrets"
              >
                <RefreshCw
                  className={cn("w-4 h-4", loading && "animate-spin")}
                />
              </button>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Select a secret to insert{" "}
              <code className="text-indigo-400">{"{{secrets.KEY}}"}</code>
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && secrets.length === 0 && (
            <div className="p-8 text-center">
              <RefreshCw
                className="w-8 h-8 mx-auto mb-2 animate-spin"
                style={{ color: "var(--text-muted)" }}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Loading secrets...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && secrets.length === 0 && (
            <div className="p-8 text-center">
              <Lock
                className="w-8 h-8 mx-auto mb-2 opacity-50"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                No secrets found
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Add secrets in Dashboard → Secrets
              </p>
            </div>
          )}

          {/* Secrets list */}
          {!loading && !error && filteredSecrets.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {filteredSecrets.map((secret) => {
                const Icon = getSecretIcon(secret.type);
                return (
                  <button
                    key={secret.id}
                    type="button"
                    onClick={() => {
                      onSelect(`{{secrets.${secret.key}}}`);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full px-3 py-2.5 text-left transition-colors hover:bg-white/5 border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          "w-4 h-4 mt-0.5 flex-shrink-0",
                          getSecretColor(secret.type),
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {secret.name}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "var(--input-bg, rgba(0,0,0,0.2))",
                              color: "var(--text-muted)",
                            }}
                          >
                            {secret.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] text-indigo-400">{`{{secrets.${secret.key}}}`}</code>
                        </div>
                        {secret.description && (
                          <p
                            className="text-[10px] mt-1 truncate"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {secret.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer with hint */}
          {filteredSecrets.length > 0 && (
            <div
              className="p-2 border-t text-center"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <button
                type="button"
                onClick={() => window.open("/dashboard/secrets", "_blank")}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Manage secrets →
              </button>
            </div>
          )}
        </div>,
          document.body,
        )
      )}
    </div>
  );
};
