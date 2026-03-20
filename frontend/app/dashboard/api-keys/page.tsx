"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Key as KeyIcon,
  Plus,
  Search,
  Eye,
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
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "@/app/config";
import { getAuthHeaders } from "@/lib/auth-token";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  workspaceId?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
}

interface ApiKeyFormData {
  name: string;
  workspaceId?: string;
  scopes: string[];
  expiresInDays: string;
}

const API_SCOPES = [
  {
    value: "READ",
    label: "Read",
    description: "GET execution run status, logs, SSE (and future read-only APIs)",
  },
  { value: "WRITE", label: "Write", description: "Create and modify workflows (reserved for future routes)" },
  {
    value: "EXECUTE",
    label: "Execute",
    description: "POST start/cancel/approve workflow runs via /api/v1/execution/*",
  },
  { value: "ADMIN", label: "Admin", description: "All scopes (same as full access for API key auth)" },
];

export default function ApiKeysPage() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRevoked, setShowRevoked] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  // Form states
  const [formData, setFormData] = useState<ApiKeyFormData>({
    name: "",
    workspaceId: "",
    scopes: ["READ", "EXECUTE"],
    expiresInDays: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New key display state
  const [newKey, setNewKey] = useState<string | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/api-keys`, {
        headers: getAuthHeaders(),
        params: { includeRevoked: showRevoked },
      });
      setApiKeys(res.data);
    } catch (err: any) {
      console.error("Failed to load API keys:", err);
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router, showRevoked]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const filteredApiKeys = apiKeys.filter((apiKey) => {
    const matchesSearch =
      apiKey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apiKey.prefix.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCreate = async () => {
    try {
      setSaving(true);
      const res = await axios.post(`${BACKEND_URL}/api/v1/api-keys`, formData, {
        headers: getAuthHeaders(),
      });
      setNewKey(res.data.key);
      setShowCreateModal(false);
      resetForm();
      loadApiKeys();
    } catch (err: any) {
      console.error("Failed to create API key:", err);
      alert(err.response?.data?.error || "Failed to create API key");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedKey) return;
    try {
      setSaving(true);
      await axios.put(`${BACKEND_URL}/api/v1/api-keys/${selectedKey.id}`, formData, {
        headers: getAuthHeaders(),
      });
      setShowEditModal(false);
      setSelectedKey(null);
      resetForm();
      loadApiKeys();
    } catch (err: any) {
      console.error("Failed to update API key:", err);
      alert(err.response?.data?.error || "Failed to update API key");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    try {
      setDeleting(true);
      await axios.delete(`${BACKEND_URL}/api/v1/api-keys/${selectedKey.id}`, {
        headers: getAuthHeaders(),
      });
      setShowDeleteModal(false);
      setSelectedKey(null);
      loadApiKeys();
    } catch (err: any) {
      console.error("Failed to delete API key:", err);
      alert(err.response?.data?.error || "Failed to delete API key");
    } finally {
      setDeleting(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;
    try {
      setDeleting(true);
      await axios.post(`${BACKEND_URL}/api/v1/api-keys/${selectedKey.id}/revoke`, {}, {
        headers: getAuthHeaders(),
      });
      setShowRevokeModal(false);
      setSelectedKey(null);
      loadApiKeys();
    } catch (err: any) {
      console.error("Failed to revoke API key:", err);
      alert(err.response?.data?.error || "Failed to revoke API key");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (value: string, keyId: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      workspaceId: "",
      scopes: ["READ", "EXECUTE"],
      expiresInDays: "",
    });
  };

  const openEditModal = (apiKey: ApiKey) => {
    setSelectedKey(apiKey);
    setFormData({
      name: apiKey.name,
      workspaceId: apiKey.workspaceId || "",
      scopes: [...apiKey.scopes],
      expiresInDays: "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (apiKey: ApiKey) => {
    setSelectedKey(apiKey);
    setShowDeleteModal(true);
  };

  const openRevokeModal = (apiKey: ApiKey) => {
    setSelectedKey(apiKey);
    setShowRevokeModal(true);
  };

  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
              API Keys
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Manage API keys for programmatic access to your workflows
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
            <span>New API Key</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search API keys..."
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

          <label className="flex items-center space-x-2 text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={showRevoked}
              onChange={(e) => setShowRevoked(e.target.checked)}
              className="rounded focus:ring-1 focus:ring-indigo-500/50"
            />
            <span>Show revoked</span>
          </label>

          <button
            onClick={loadApiKeys}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div
          className="mt-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: "var(--border-subtle)",
            background: "rgba(99, 102, 241, 0.06)",
          }}
        >
          <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            External apps &amp; servers
          </p>
          <ul className="space-y-1.5 list-disc pl-4" style={{ color: "var(--text-muted)" }}>
            <li>
              Authenticate with{" "}
              <code className="text-indigo-400 text-xs">X-Api-Key: ak_…</code> or{" "}
              <code className="text-indigo-400 text-xs">Authorization: Bearer ak_…</code>{" "}
              (not your login JWT).
            </li>
            <li>
              <strong>EXECUTE</strong> — start/cancel/approve:{" "}
              <code className="text-indigo-400 text-xs">POST …/execution/run/:workflowId</code>
            </li>
            <li>
              <strong>READ</strong> — poll runs &amp; steps:{" "}
              <code className="text-indigo-400 text-xs">GET …/execution/run/:runId</code>,{" "}
              <code className="text-indigo-400 text-xs">/logs/:runId</code>, etc.
            </li>
            <li>
              Workspace-scoped keys can only access workflows in that workspace.
            </li>
          </ul>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredApiKeys.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 rounded-lg border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
          >
            <KeyIcon className="w-12 h-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              No API keys found
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {apiKeys.length === 0 ? "Get started by creating your first API key" : "Try adjusting your search"}
            </p>
          </div>
        ) : (
          filteredApiKeys.map((apiKey) => {
            const isExpiredValue = isExpired(apiKey.expiresAt);

            return (
              <div
                key={apiKey.id}
                className="p-4 rounded-lg border transition-colors hover:border-indigo-500/30"
                style={{
                  background: "var(--bg-card)",
                  borderColor: apiKey.isRevoked ? "rgba(156,163,175,0.2)" : isExpiredValue ? "rgba(239,68,68,0.2)" : "var(--border-subtle)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium truncate" style={{ color: apiKey.isRevoked ? "var(--text-muted)" : "var(--text-primary)" }}>
                        {apiKey.name}
                      </h3>
                      {apiKey.isRevoked && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-500">
                          <Ban className="w-3 h-3" />
                          <span>Revoked</span>
                        </span>
                      )}
                      {isExpiredValue && !apiKey.isRevoked && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Expired</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <KeyIcon className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <code className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                          {apiKey.prefix}...
                        </code>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {apiKey.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-500"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(apiKey.createdAt)}</span>
                        </span>
                        {apiKey.lastUsedAt && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Last used {formatDate(apiKey.lastUsedAt)}</span>
                          </span>
                        )}
                        {apiKey.expiresAt && (
                          <span className={`flex items-center space-x-1 ${isExpiredValue ? "text-red-500" : ""}`}>
                            <Calendar className="w-3 h-3" />
                            <span>Expires {formatDate(apiKey.expiresAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    {!apiKey.isRevoked && (
                      <button
                        onClick={() => openEditModal(apiKey)}
                        className="p-1.5 rounded hover:bg-white/5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {!apiKey.isRevoked && (
                      <button
                        onClick={() => openRevokeModal(apiKey)}
                        className="p-1.5 rounded hover:bg-amber-500/10 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        title="Revoke"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(apiKey)}
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

      {/* New Key Display Modal */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setNewKey(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl shadow-2xl p-6"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  API Key Created Successfully
                </h2>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Copy this key now. You won't be able to see it again.
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={newKey}
                  readOnly
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                />
                <button
                  onClick={() => handleCopy(newKey, "new")}
                  className="absolute top-2 right-2 p-2 rounded hover:bg-white/10 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title="Copy to clipboard"
                >
                  {copiedKey === "new" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                onClick={() => setNewKey(null)}
                className="w-full mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                I've copied the key
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              setSelectedKey(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {showCreateModal ? "Create API Key" : "Edit API Key"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedKey(null);
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
                    placeholder="e.g., Production Integration"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    Scopes <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {API_SCOPES.map((scope) => (
                      <label key={scope.value} className="flex items-start space-x-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors" style={{ border: "1px solid var(--border-subtle)" }}>
                        <input
                          type="checkbox"
                          checked={formData.scopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                          className="mt-0.5 rounded focus:ring-1 focus:ring-indigo-500/50"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {scope.label}
                            </span>
                            <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              {scope.value}
                            </code>
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            {scope.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {showCreateModal && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      Expiration (Optional)
                    </label>
                    <select
                      value={formData.expiresInDays}
                      onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="">No expiration</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 p-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedKey(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={showCreateModal ? handleCreate : handleUpdate}
                  disabled={saving || !formData.name || formData.scopes.length === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : showCreateModal ? "Create API Key" : "Update API Key"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedKey(null);
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
                  Delete API Key?
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Are you sure you want to delete <strong>{selectedKey.name}</strong>? This action cannot be undone and all access will be permanently removed.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedKey(null);
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
                    {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Delete API Key"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke Confirmation Modal */}
      <AnimatePresence>
        {showRevokeModal && selectedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => {
              setShowRevokeModal(false);
              setSelectedKey(null);
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
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
                  <Ban className="w-6 h-6 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Revoke API Key?
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Are you sure you want to revoke <strong>{selectedKey.name}</strong>? The key will be immediately disabled and can no longer be used.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => {
                      setShowRevokeModal(false);
                      setSelectedKey(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Revoke API Key"}
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
