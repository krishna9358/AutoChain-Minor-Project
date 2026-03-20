"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Key,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";

interface Secret {
  id: string;
  name: string;
  key: string;
  type: string;
  description?: string;
  valuePreview: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface SecretFormData {
  name: string;
  key: string;
  value: string;
  type: string;
  description: string;
  expiresAt?: string;
}

const SECRET_TYPES = [
  { value: "API_KEY", label: "API Key" },
  { value: "PASSWORD", label: "Password" },
  { value: "TOKEN", label: "Token" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "DATABASE_URL", label: "Database URL" },
  { value: "OTHER", label: "Other" },
];

export default function SecretsPage() {
  const router = useRouter();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showRevoked, setShowRevoked] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);

  // Form states
  const [formData, setFormData] = useState<SecretFormData>({
    name: "",
    key: "",
    value: "",
    type: "OTHER",
    description: "",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reveal states
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<Set<string>>(new Set());

  // Copy feedback
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  const loadSecrets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/secrets`, {
        headers: getAuthHeaders(),
      });
      setSecrets(res.data);
    } catch (err: any) {
      console.error("Failed to load secrets:", err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const filteredSecrets = secrets.filter((secret) => {
    const matchesSearch =
      secret.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      secret.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (secret.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === "all" || secret.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreate = async () => {
    try {
      setSaving(true);
      await axios.post(`${BACKEND_URL}/api/v1/secrets`, formData, {
        headers: getAuthHeaders(),
      });
      setShowCreateModal(false);
      resetForm();
      loadSecrets();
    } catch (err: any) {
      console.error("Failed to create secret:", err);
      alert(err.response?.data?.error || "Failed to create secret");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSecret) return;
    try {
      setSaving(true);
      await axios.put(`${BACKEND_URL}/api/v1/secrets/${selectedSecret.id}`, formData, {
        headers: getAuthHeaders(),
      });
      setShowEditModal(false);
      setSelectedSecret(null);
      resetForm();
      loadSecrets();
    } catch (err: any) {
      console.error("Failed to update secret:", err);
      alert(err.response?.data?.error || "Failed to update secret");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSecret) return;
    try {
      setDeleting(true);
      await axios.delete(`${BACKEND_URL}/api/v1/secrets/${selectedSecret.id}`, {
        headers: getAuthHeaders(),
      });
      setShowDeleteModal(false);
      setSelectedSecret(null);
      loadSecrets();
    } catch (err: any) {
      console.error("Failed to delete secret:", err);
      alert(err.response?.data?.error || "Failed to delete secret");
    } finally {
      setDeleting(false);
    }
  };

  const handleReveal = async (secretId: string) => {
    try {
      setRevealing((prev) => new Set([...prev, secretId]));
      const res = await axios.post(`${BACKEND_URL}/api/v1/secrets/${secretId}/reveal`, {}, {
        headers: getAuthHeaders(),
      });
      setRevealedValues((prev) => ({ ...prev, [secretId]: res.data.value }));
      setRevealedSecrets((prev) => new Set([...prev, secretId]));
    } catch (err: any) {
      console.error("Failed to reveal secret:", err);
      alert(err.response?.data?.error || "Failed to reveal secret");
    } finally {
      setRevealing((prev) => {
        const next = new Set(prev);
        next.delete(secretId);
        return next;
      });
    }
  };

  const handleCopy = (value: string, secretId: string) => {
    navigator.clipboard.writeText(value);
    setCopiedSecret(secretId);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      key: "",
      value: "",
      type: "OTHER",
      description: "",
      expiresAt: "",
    });
  };

  const openEditModal = (secret: Secret) => {
    setSelectedSecret(secret);
    setFormData({
      name: secret.name,
      key: secret.key,
      value: "", // Don't pre-fill value for security
      type: secret.type,
      description: secret.description || "",
      expiresAt: secret.expiresAt?.split("T")[0] || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (secret: Secret) => {
    setSelectedSecret(secret);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      API_KEY: "text-blue-500 bg-blue-500/10",
      PASSWORD: "text-red-500 bg-red-500/10",
      TOKEN: "text-purple-500 bg-purple-500/10",
      CERTIFICATE: "text-amber-500 bg-amber-500/10",
      DATABASE_URL: "text-emerald-500 bg-emerald-500/10",
      OTHER: "text-gray-500 bg-gray-500/10",
    };
    return colors[type] || colors.OTHER;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Secret library
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Securely store keys and reference them in nodes as{" "}
              <code className="text-indigo-400">{"{{secrets.KEY}}"}</code>
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Secret</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search secrets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">All Types</option>
            {SECRET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <button
            onClick={loadSecrets}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Secrets List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredSecrets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 rounded-lg border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            <Shield className="w-12 h-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              No secrets found
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {secrets.length === 0
                ? "Get started by creating your first secret"
                : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          filteredSecrets.map((secret) => {
            const isRevealed = revealedSecrets.has(secret.id);
            const isRevealing = revealing.has(secret.id);
            const isExpiredValue = isExpired(secret.expiresAt);
            const value = isRevealed ? revealedValues[secret.id] : secret.valuePreview;

            return (
              <div
                key={secret.id}
                className="p-4 rounded-lg border transition-colors hover:border-indigo-500/30"
                style={{
                  background: "var(--bg-card)",
                  borderColor: isExpiredValue ? "rgba(239,68,68,0.2)" : "var(--border-subtle)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {secret.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getTypeColor(secret.type)}`}>
                        {secret.type.replace("_", " ")}
                      </span>
                      {isExpiredValue && (
                        <span className="flex items-center space-x-1 text-[10px] text-red-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Expired</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Key className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <code className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                          {secret.key}
                        </code>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <input
                            type={isRevealed ? "text" : "password"}
                            value={value}
                            readOnly
                            className="w-full px-3 py-1.5 rounded text-xs font-mono"
                            style={{
                              background: isExpiredValue ? "rgba(239,68,68,0.05)" : "var(--bg-elevated)",
                              border: "1px solid var(--border-subtle)",
                              color: isExpiredValue ? "rgba(239,68,68,0.8)" : "var(--text-secondary)",
                            }}
                          />
                        </div>
                        <button
                          onClick={() => (isRevealed ? setRevealedSecrets((prev) => {
                            const next = new Set(prev);
                            next.delete(secret.id);
                            return next;
                          }) : handleReveal(secret.id))}
                          disabled={isRevealing}
                          className="p-1.5 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
                          style={{ color: "var(--text-muted)" }}
                          title={isRevealed ? "Hide" : "Reveal"}
                        >
                          {isRevealing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isRevealed && (
                          <button
                            onClick={() => handleCopy(revealedValues[secret.id], secret.id)}
                            className="p-1.5 rounded hover:bg-white/5 transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            title="Copy"
                          >
                            {copiedSecret === secret.id ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {secret.description && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {secret.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(secret.createdAt)}</span>
                        </span>
                        {secret.lastUsedAt && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Last used {formatDate(secret.lastUsedAt)}</span>
                          </span>
                        )}
                        {secret.expiresAt && (
                          <span className={`flex items-center space-x-1 ${isExpiredValue ? "text-red-500" : ""}`}>
                            <Calendar className="w-3 h-3" />
                            <span>Expires {formatDate(secret.expiresAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => openEditModal(secret)}
                      className="p-1.5 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(secret)}
                      className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedSecret(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl shadow-2xl"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {showCreateModal ? "Create Secret" : "Edit Secret"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedSecret(null);
                  }}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Production API Key"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    placeholder="e.g., API_KEY_PRODUCTION"
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Reference name for <code className="text-indigo-400">{"{{secrets.KEY}}"}</code> — use
                    letters, numbers, and underscores (e.g.{" "}
                    <code className="text-indigo-400/90">STRIPE_API_KEY</code>). This is not your encryption
                    passphrase.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {SECRET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Value <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Enter secret value..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                  {showEditModal && (
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      Leave blank to keep existing value
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedSecret(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={showCreateModal ? handleCreate : handleUpdate}
                  disabled={saving || !formData.name || !formData.key || (!showEditModal && !formData.value)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : showCreateModal ? "Create Secret" : "Update Secret"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedSecret && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedSecret(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl shadow-2xl"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Delete Secret?
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Are you sure you want to delete <strong>{selectedSecret.name}</strong>? This action cannot be undone.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedSecret(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Delete Secret"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
