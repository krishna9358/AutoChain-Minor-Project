"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { BACKEND_URL } from "@/app/config";
import { useTheme } from "@/components/ThemeProvider";
import {
  Zap, Plus, ChevronRight, Loader2, Workflow, LayoutGrid,
  Settings, LogOut, Search, Sun, Moon, PanelLeftClose, PanelLeft,
  LayoutTemplate, Key, Link2, ArrowRight,
} from "lucide-react";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-demo-token";

interface WorkflowItem {
  id: string; name: string; description?: string; status: string;
  createdAt: string; updatedAt: string; nodes: any[]; edges: any[];
  _count?: { runs: number; versions: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-zinc-400", ACTIVE: "text-emerald-500", PAUSED: "text-amber-500",
  ARCHIVED: "text-zinc-500",
};
const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-zinc-400", ACTIVE: "bg-emerald-500", PAUSED: "bg-amber-500",
  ARCHIVED: "bg-zinc-500",
};

// ─── Templates (moved to dashboard) ─────────────────────────
const TEMPLATES = [
  {
    id: "meeting", name: "Meeting Intelligence", icon: "🎤",
    description: "Process meeting transcripts, extract action items, and notify on Slack",
    nodes: [
      { nodeType: "WEBHOOK_TRIGGER", label: "Meeting Webhook", category: "TRIGGER", config: { webhookPath: "/meetings", method: "POST" } },
      { nodeType: "EXTRACTION_AGENT", label: "Extract Action Items", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Extract action items with assignees from the meeting transcript" } },
      { nodeType: "CLASSIFICATION_AGENT", label: "Prioritize Tasks", category: "AI_AGENT", config: { model: "gpt-4", categories: "high,medium,low" } },
      { nodeType: "SLACK_SEND", label: "Notify Team", category: "ACTION", config: { channel: "#team-updates", messageTemplate: "New action items from meeting" } },
    ],
  },
  {
    id: "support", name: "Support Ticket AI", icon: "🎫",
    description: "Auto-classify tickets, draft AI responses, and route to the right team",
    nodes: [
      { nodeType: "WEBHOOK_TRIGGER", label: "New Ticket", category: "TRIGGER", config: { webhookPath: "/tickets", method: "POST" } },
      { nodeType: "CLASSIFICATION_AGENT", label: "Classify Issue", category: "AI_AGENT", config: { model: "gpt-4", categories: "billing,technical,general,urgent" } },
      { nodeType: "REASONING_AGENT", label: "Draft Response", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Draft a helpful support response" } },
      { nodeType: "APPROVAL", label: "Manager Review", category: "CONTROL", config: { approver: "support-lead", timeoutMinutes: 30 } },
      { nodeType: "EMAIL_SEND", label: "Send Reply", category: "ACTION", config: { from: "support@company.com", subject: "Re: Your support request" } },
    ],
  },
  {
    id: "sales", name: "Lead Qualification", icon: "🎯",
    description: "Score and qualify inbound leads, then route to sales reps",
    nodes: [
      { nodeType: "API_TRIGGER", label: "New Lead", category: "TRIGGER", config: { endpoint: "/api/leads", method: "POST" } },
      { nodeType: "EXTRACTION_AGENT", label: "Enrich Lead", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Extract company info, role, and intent from lead data" } },
      { nodeType: "DECISION_AGENT", label: "Score Lead", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Score lead quality from 1-100" } },
      { nodeType: "IF_CONDITION", label: "High Score?", category: "LOGIC", config: { condition: "score > 70", trueLabel: "Qualified", falseLabel: "Nurture" } },
      { nodeType: "EMAIL_SEND", label: "Notify Rep", category: "ACTION", config: { to: "sales@company.com", subject: "New qualified lead" } },
    ],
  },
  {
    id: "invoice", name: "Invoice Processing", icon: "📄",
    description: "Extract invoice data, validate, and route for approval",
    nodes: [
      { nodeType: "FILE_UPLOAD_TRIGGER", label: "Invoice Upload", category: "TRIGGER", config: { allowedTypes: "pdf,png,jpg", maxSizeMB: 10 } },
      { nodeType: "EXTRACTION_AGENT", label: "Extract Data", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Extract vendor, amount, date, line items from invoice" } },
      { nodeType: "VERIFICATION_AGENT", label: "Validate", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Verify extracted data is complete and amounts are correct" } },
      { nodeType: "APPROVAL", label: "Manager Approval", category: "CONTROL", config: { approver: "finance-lead", timeoutMinutes: 60 } },
      { nodeType: "DB_WRITE", label: "Save to DB", category: "ACTION", config: { table: "invoices", operation: "insert" } },
    ],
  },
  {
    id: "onboarding", name: "Employee Onboarding", icon: "👋",
    description: "Automate new hire setup with IT provisioning and welcome messages",
    nodes: [
      { nodeType: "WEBHOOK_TRIGGER", label: "New Hire Event", category: "TRIGGER", config: { webhookPath: "/hr/newhire", method: "POST" } },
      { nodeType: "HTTP_REQUEST", label: "Create Accounts", category: "ACTION", config: { url: "https://it-api.internal/provision", method: "POST" } },
      { nodeType: "EMAIL_SEND", label: "Welcome Email", category: "ACTION", config: { subject: "Welcome aboard!", from: "hr@company.com" } },
      { nodeType: "SLACK_SEND", label: "Intro on Slack", category: "ACTION", config: { channel: "#general", messageTemplate: "Please welcome our new team member!" } },
    ],
  },
  {
    id: "incident", name: "Incident Response", icon: "🚨",
    description: "Classify alerts, analyze root cause, and escalate as needed",
    nodes: [
      { nodeType: "WEBHOOK_TRIGGER", label: "Alert Received", category: "TRIGGER", config: { webhookPath: "/alerts", method: "POST" } },
      { nodeType: "CLASSIFICATION_AGENT", label: "Classify Severity", category: "AI_AGENT", config: { model: "gpt-4", categories: "critical,high,medium,low" } },
      { nodeType: "REASONING_AGENT", label: "Root Cause Analysis", category: "AI_AGENT", config: { model: "gpt-4", prompt: "Analyze logs and determine probable root cause" } },
      { nodeType: "IF_CONDITION", label: "Is Critical?", category: "LOGIC", config: { condition: "severity === 'critical'", trueLabel: "Escalate", falseLabel: "Log" } },
      { nodeType: "SLACK_SEND", label: "Notify On-Call", category: "ACTION", config: { channel: "#incidents", messageTemplate: "🚨 Incident alert" } },
    ],
  },
];

// ─── Nav items ──────────────────────────────────────────────
type TabId = "workflows" | "templates" | "settings";

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("workflows");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    initDashboard();
    const k = localStorage.getItem("agentflow-api-key"); if (k) setApiKey(k);
    const w = localStorage.getItem("agentflow-webhook-url"); if (w) setWebhookUrl(w);
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(true); }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initDashboard = async () => {
    let token = localStorage.getItem("token");
    if (!token && IS_DEV) {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/v1/user/dev-bootstrap`);
        token = res.data.token;
        localStorage.setItem("token", token!);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } catch { token = DEV_TOKEN; localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify({ name: "Dev User" })); }
    }
    if (!token) { router.push("/login"); return; }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/workflows`, { headers: { Authorization: token } }).catch(() => ({ data: [] }));
      setWorkflows(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const importTemplate = (template: typeof TEMPLATES[0]) => {
    // Build nodes with positions in a vertical layout
    const nodes = template.nodes.map((n, i) => ({
      id: `${n.nodeType}-${Date.now()}-${i}`,
      type: "workflowNode",
      position: { x: 300, y: i * 140 },
      data: { nodeType: n.nodeType, category: n.category, label: n.label, config: n.config },
    }));
    // Build edges connecting sequential nodes
    const edges = nodes.slice(0, -1).map((n, i) => ({
      id: `e-${i}`,
      source: n.id,
      target: nodes[i + 1].id,
    }));
    // Store in sessionStorage so workflow builder can pick it up
    sessionStorage.setItem("template-import", JSON.stringify({ name: template.name, description: template.description, nodes, edges }));
    router.push("/workflow/new?from=template");
  };

  const saveSettings = () => {
    localStorage.setItem("agentflow-api-key", apiKey);
    localStorage.setItem("agentflow-webhook-url", webhookUrl);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const userName = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || '{"name":"User"}').name : "User";
  const filtered = workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );

  const navItems: { icon: typeof LayoutGrid; label: string; id: TabId }[] = [
    { icon: Workflow, label: "Workflows", id: "workflows" },
    { icon: LayoutTemplate, label: "Templates", id: "templates" },
    { icon: Settings, label: "Settings", id: "settings" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* ─── Command Palette ──── */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setCmdOpen(false)}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
              onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center px-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search workflows..."
                  className="flex-1 px-3 py-3 text-sm bg-transparent border-none outline-none" style={{ color: "var(--text-primary)" }} />
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>ESC</kbd>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="p-4 text-sm text-center" style={{ color: "var(--text-muted)" }}>No results</p>
                ) : filtered.map(wf => (
                  <button key={wf.id} onClick={() => { setCmdOpen(false); setSearchQuery(""); router.push(`/workflow/${wf.id}`); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-primary)" }}>
                    <Workflow className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm truncate">{wf.name}</span>
                    <span className={`ml-auto text-[10px] ${STATUS_COLORS[wf.status]}`}>{wf.status}</span>
                  </button>
                ))}
                <button onClick={() => { setCmdOpen(false); setSearchQuery(""); router.push("/workflow/new"); }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 border-t mt-1 pt-3"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                  <Plus className="w-4 h-4" /><span className="text-sm">Create new workflow</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Sidebar ──── */}
      <aside className={`${sidebarOpen ? "w-56" : "w-14"} border-r fixed h-full z-30 flex flex-col transition-all duration-200`}
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between px-3 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-white" /></div>
            {sidebarOpen && <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>AgentFlow</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${sidebarOpen ? "space-x-3 px-3" : "justify-center px-0"} py-2 rounded-lg text-sm transition-all`}
              style={{ background: activeTab === item.id ? "rgba(99,102,241,0.08)" : "transparent", color: activeTab === item.id ? "#6366f1" : "var(--text-muted)" }}
              title={!sidebarOpen ? item.label : undefined}>
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t space-y-1" style={{ borderColor: "var(--border-subtle)" }}>
          <button onClick={toggleTheme} className={`w-full flex items-center ${sidebarOpen ? "space-x-3 px-3" : "justify-center"} py-2 rounded-lg text-sm transition-all`}
            style={{ color: "var(--text-muted)" }}>
            {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {sidebarOpen && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
          </button>
          <div className={`flex items-center ${sidebarOpen ? "justify-between px-3" : "justify-center"} py-2`}>
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && <span className="text-sm truncate max-w-[100px]" style={{ color: "var(--text-secondary)" }}>{userName}</span>}
            </div>
            {sidebarOpen && (
              <button onClick={() => { localStorage.clear(); router.push("/login"); }} style={{ color: "var(--text-muted)" }} className="hover:opacity-70">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ──── */}
      <main className={`flex-1 ${sidebarOpen ? "ml-56" : "ml-14"} transition-all duration-200`}>
        {/* Header */}
        <header className="sticky top-0 z-20 border-b px-6 py-4 backdrop-blur-xl" style={{ background: "color-mix(in srgb, var(--bg-primary) 85%, transparent)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold capitalize" style={{ color: "var(--text-primary)" }}>{activeTab}</h1>
            <div className="flex items-center space-x-3">
              <button onClick={() => setCmdOpen(true)} className="flex items-center space-x-3 px-3 py-2 w-60 rounded-lg border text-sm"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-muted)" }}>
                <Search className="w-3.5 h-3.5" /><span>Search...</span>
                <kbd className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: "var(--border-subtle)" }}>⌘K</kbd>
              </button>
              {activeTab === "workflows" && (
                <button onClick={() => router.push("/workflow/new")} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /><span>New</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* ──── Workflows Tab ──── */}
          {activeTab === "workflows" && (
            <>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-4" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-hover)" }}>
                    <Workflow className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <h3 className="text-base font-medium mb-1" style={{ color: "var(--text-primary)" }}>No workflows yet</h3>
                  <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Create your first workflow or start from a template.</p>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => router.push("/workflow/new")} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                      <Plus className="w-4 h-4" /><span>Create Workflow</span>
                    </button>
                    <button onClick={() => setActiveTab("templates")} className="flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)" }}>
                      <LayoutTemplate className="w-4 h-4" /><span>Browse Templates</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((wf, i) => (
                    <motion.button key={wf.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      onClick={() => router.push(`/workflow/${wf.id}`)}
                      className="w-full flex items-center px-4 py-3 rounded-lg border transition-all text-left group hover:border-indigo-500/20"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-3" style={{ background: "rgba(99,102,241,0.08)" }}>
                        <Workflow className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{wf.name}</span>
                          <span className="flex items-center space-x-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[wf.status] || "bg-zinc-400"}`} />
                            <span className={`text-[10px] ${STATUS_COLORS[wf.status] || "text-zinc-400"}`}>{wf.status}</span>
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {wf.description || `${wf.nodes?.length || 0} nodes · ${wf._count?.runs || 0} runs`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{new Date(wf.updatedAt).toLocaleDateString()}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ──── Templates Tab ──── */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border p-5 transition-all hover:border-indigo-500/30"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t.name}</h3>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t.nodes.length} nodes</p>
                    </div>
                  </div>
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t.description}</p>
                  {/* Node preview */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {t.nodes.map((n, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                        {n.label}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => importTemplate(t)}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors">
                    <span>Use Template</span><ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ──── Settings Tab ──── */}
          {activeTab === "settings" && (
            <div className="max-w-lg space-y-6">
              <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium flex items-center space-x-1.5 mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      <Key className="w-3.5 h-3.5" /><span>OpenAI API Key</span>
                    </label>
                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..."
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Used for AI workflow generation and agent execution</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium flex items-center space-x-1.5 mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      <Link2 className="w-3.5 h-3.5" /><span>Webhook Base URL</span>
                    </label>
                    <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://hooks.your-domain.com"
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Base URL for webhook triggers</p>
                  </div>
                  <button onClick={saveSettings}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <span>{settingsSaved ? "✓ Saved" : "Save Settings"}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Appearance</h3>
                <div className="flex items-center space-x-3">
                  <button onClick={() => theme !== "light" && toggleTheme()}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${theme === "light" ? "border-indigo-500 bg-indigo-500/5" : ""}`}
                    style={{ borderColor: theme === "light" ? "#6366f1" : "var(--border-subtle)", color: "var(--text-primary)" }}>
                    <Sun className="w-4 h-4 mx-auto mb-1" />Light
                  </button>
                  <button onClick={() => theme !== "dark" && toggleTheme()}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${theme === "dark" ? "border-indigo-500 bg-indigo-500/5" : ""}`}
                    style={{ borderColor: theme === "dark" ? "#6366f1" : "var(--border-subtle)", color: "var(--text-primary)" }}>
                    <Moon className="w-4 h-4 mx-auto mb-1" />Dark
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}