"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sparkles,
  Search,
  Play,
  X,
  FileDown,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Layers,
  Clock,
  Star,
  Filter,
  ArrowRight,
} from "lucide-react";
import { resolveIcon, categoryColor } from "./config/iconMap";

export interface TemplatePreview {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  tags: string[];
  preview: {
    color: string;
    estimatedTime: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    useCases: string[];
  };
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
    position: { x: number; y: number };
    config: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
  }>;
}

interface TemplateLibraryProps {
  templates: TemplatePreview[];
  onSelectTemplate?: (template: TemplatePreview) => void;
  onImportTemplate?: (template: TemplatePreview) => void;
}

const CATEGORIES = [
  { id: "all", name: "All", icon: Layers },
  { id: "enterprise", name: "Enterprise", icon: Star },
  { id: "automation", name: "Automation", icon: Play },
  { id: "ai", name: "AI-Powered", icon: Sparkles },
  { id: "operations", name: "Operations", icon: Filter },
];

const DIFFICULTY_COLORS = {
  beginner: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Beginner" },
  intermediate: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Intermediate" },
  advanced: { bg: "bg-red-500/10", text: "text-red-400", label: "Advanced" },
};

const NODE_CATEGORY_MAP: Record<string, string> = {
  "ai-agent": "ai",
  "chat-model": "ai",
  "agent-memory": "ai",
  "agent-tool": "ai",
  "text-transform": "ai",
  "data-enrichment": "ai",
  "entry-point": "input",
  "form-input": "input",
  "http-request": "integration",
  "slack-send": "integration",
  "email-send": "integration",
  "db-query": "integration",
  "if-condition": "logic",
  "switch-case": "logic",
  loop: "logic",
  delay: "control",
  "error-handler": "control",
  approval: "control",
  "sla-monitor": "control",
  "task-assigner": "control",
  escalation: "control",
  "artifact-writer": "output",
  "webhook-response": "output",
  "audit-log": "output",
  "document-generator": "output",
};

/** Convert template nodes/edges to React Flow format for the mini-preview */
function buildPreviewFlow(template: TemplatePreview): { nodes: Node[]; edges: Edge[] } {
  const mainNodes = template.nodes.filter(
    (n) => !["chat-model", "agent-memory", "agent-tool"].includes(n.type),
  );

  const nodes: Node[] = mainNodes.map((n, i) => {
    const cat = NODE_CATEGORY_MAP[n.type] || "control";
    const color = categoryColor(cat);
    return {
      id: n.id,
      type: "default",
      position: n.position || { x: 60 + i * 160, y: 40 },
      data: { label: n.name },
      style: {
        background: `${color}18`,
        border: `1.5px solid ${color}60`,
        borderRadius: 8,
        padding: "4px 8px",
        fontSize: 8,
        color: color,
        fontWeight: 600,
        minWidth: 80,
        textAlign: "center" as const,
      },
    };
  });

  const mainNodeIds = new Set(mainNodes.map((n) => n.id));
  const edges: Edge[] = template.edges
    .filter((e) => mainNodeIds.has(e.source) && mainNodeIds.has(e.target) && !e.sourceHandle)
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))", width: 10, height: 10 },
    }));

  return { nodes, edges };
}

function MiniFlowPreview({ template }: { template: TemplatePreview }) {
  const { nodes, edges } = useMemo(() => buildPreviewFlow(template), [template]);

  return (
    <div className="w-full h-[120px] overflow-hidden border-b" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
      <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-110 pointer-events-none">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={1}
          >
            <Background color="var(--text-muted)" gap={16} size={0.5} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  onSelectTemplate,
  onImportTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreview | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = activeCategory === "all" || t.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, searchQuery]);

  const handleExportTemplate = useCallback((template: TemplatePreview, e: React.MouseEvent) => {
    e.stopPropagation();
    import("js-yaml").then((yaml) => {
      const yamlStr = yaml.dump(template, { indent: 2, lineWidth: 120, noRefs: true, sortKeys: false });
      const blob = new Blob([yamlStr], { type: "text/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.id}.yaml`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const handleImportYaml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const yaml = await import("js-yaml");
      const parsed = yaml.load(text) as TemplatePreview;
      if (!parsed.id || !parsed.name || !parsed.nodes) {
        setImportStatus({ type: "error", message: "Invalid template: missing id, name, or nodes" });
        return;
      }
      setImportStatus({ type: "success", message: `Imported "${parsed.name}" successfully!` });
      if (onImportTemplate) onImportTemplate(parsed);
    } catch {
      setImportStatus({ type: "error", message: "Failed to parse YAML file." });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && onSelectTemplate) onSelectTemplate(selectedTemplate);
    setSelectedTemplate(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          Template Library
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Ready-to-use workflow templates for enterprise automation
        </p>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
            style={{ background: "var(--input-bg, var(--input))", borderColor: "hsl(var(--border))", color: "var(--text-primary)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all hover:opacity-80"
          style={{ borderColor: "hsl(var(--border))", color: "var(--text-secondary)" }}
        >
          <FileUp className="w-4 h-4" />
          Import YAML
        </button>
        <input ref={fileInputRef} type="file" accept=".yaml,.yml" onChange={handleImportYaml} className="hidden" />
      </div>

      {/* Import Status */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-xl flex items-center gap-3 text-sm"
            style={{
              background: importStatus.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${importStatus.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: importStatus.type === "success" ? "#10b981" : "#ef4444",
            }}
          >
            {importStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {importStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: isActive ? "hsl(var(--primary))" : "transparent",
                color: isActive ? "#fff" : "var(--text-muted)",
                border: isActive ? "none" : "1px solid var(--border)",
              }}
            >
              <CatIcon className="w-3.5 h-3.5" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Count */}
      <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} found
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template) => {
            const Icon = resolveIcon(template.icon);
            const diff = DIFFICULTY_COLORS[template.preview?.difficulty || "beginner"];
            const previewColor = template.preview?.color || "hsl(var(--primary))";
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedTemplate(template)}
                className="group cursor-pointer rounded-xl border overflow-hidden transition-all hover:border-primary"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
              >
                <MiniFlowPreview template={template} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${previewColor}20`, color: previewColor }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{template.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${diff.bg} ${diff.text}`}>{diff.label}</span>
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                          <Clock className="w-2.5 h-2.5" />{template.preview?.estimatedTime || "5 min"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{template.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated, var(--muted))", color: "var(--text-muted)" }}>{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTemplate(template); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-xs font-semibold transition-colors hover:opacity-90"
                      style={{ background: "hsl(var(--primary))" }}
                    >
                      <Play className="w-3.5 h-3.5" />Use Template
                    </button>
                    <button
                      onClick={(e) => handleExportTemplate(template, e)}
                      className="p-2 rounded-lg border transition-all hover:opacity-80"
                      style={{ borderColor: "hsl(var(--border))", color: "var(--text-muted)" }}
                      title="Export as YAML"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No templates found</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Try adjusting your search or category filter</p>
        </div>
      )}

      {/* Template Detail Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTemplate(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border"
              style={{ background: "var(--bg-card, #17181c)", borderColor: "hsl(var(--border))" }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const Icon = resolveIcon(selectedTemplate.icon);
                const diff = DIFFICULTY_COLORS[selectedTemplate.preview?.difficulty || "beginner"];
                const previewColor = selectedTemplate.preview?.color || "hsl(var(--primary))";
                return (
                  <div>
                    <div className="w-full h-[200px] rounded-t-2xl overflow-hidden" style={{ background: "var(--bg-primary, #000)" }}>
                      <ReactFlowProvider>
                        <ReactFlow
                          nodes={buildPreviewFlow(selectedTemplate).nodes}
                          edges={buildPreviewFlow(selectedTemplate).edges}
                          fitView
                          fitViewOptions={{ padding: 0.4 }}
                          panOnDrag={false}
                          zoomOnScroll={false}
                          zoomOnPinch={false}
                          zoomOnDoubleClick={false}
                          nodesDraggable={false}
                          nodesConnectable={false}
                          elementsSelectable={false}
                          preventScrolling={false}
                          proOptions={{ hideAttribution: true }}
                          minZoom={0.1}
                          maxZoom={1}
                        >
                          <Background color="var(--border-subtle, #222)" gap={16} size={0.5} />
                        </ReactFlow>
                      </ReactFlowProvider>
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${previewColor}20`, color: previewColor }}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{selectedTemplate.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${diff.bg} ${diff.text}`}>{diff.label}</span>
                              <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                <Clock className="w-3 h-3" />{selectedTemplate.preview?.estimatedTime || "5 min setup"}
                              </span>
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedTemplate.nodes?.length || 0} steps</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setSelectedTemplate(null)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                          <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                        </button>
                      </div>
                      <p className="text-sm mb-5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{selectedTemplate.description}</p>
                      {selectedTemplate.preview?.useCases && (
                        <div className="mb-5">
                          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Use Cases</h3>
                          <div className="grid grid-cols-2 gap-1.5">
                            {selectedTemplate.preview.useCases.map((uc, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{uc}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mb-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Workflow Steps</h3>
                        <div className="space-y-2">
                          {selectedTemplate.nodes?.filter((n) => !["chat-model", "agent-memory", "agent-tool"].includes(n.type)).map((node, idx) => (
                            <div key={node.id} className="flex items-start gap-2.5">
                              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--accent, #061622)", color: "hsl(var(--primary))" }}>{idx + 1}</div>
                              <div>
                                <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{node.name}</div>
                                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{node.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {selectedTemplate.tags?.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--bg-elevated, var(--muted))", color: "var(--text-muted)" }}>{tag}</span>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleUseTemplate} className="flex-1 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm hover:opacity-90" style={{ background: "hsl(var(--primary))" }}>
                          <Play className="w-4 h-4" />Use This Template
                        </button>
                        <button onClick={(e) => handleExportTemplate(selectedTemplate, e)} className="px-5 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium hover:opacity-80" style={{ borderColor: "hsl(var(--border))", color: "var(--text-secondary)" }}>
                          <FileDown className="w-4 h-4" />Export
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateLibrary;
