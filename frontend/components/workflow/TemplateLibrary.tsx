"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { resolveIcon } from "./config/iconMap";

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
    label?: string;
  }>;
}

interface TemplateLibraryProps {
  templates: TemplatePreview[];
  onSelectTemplate?: (template: TemplatePreview) => void;
  onImportTemplate?: (template: TemplatePreview) => void;
}

const CATEGORIES = [
  { id: "all", name: "All Templates", icon: Layers },
  { id: "enterprise", name: "Enterprise", icon: Star },
  { id: "automation", name: "Automation", icon: Play },
  { id: "ai", name: "AI-Powered", icon: Sparkles },
  { id: "operations", name: "Operations", icon: Filter },
];

const DIFFICULTY_COLORS = {
  beginner: { bg: "bg-green-100", text: "text-green-700", label: "Beginner" },
  intermediate: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Intermediate",
  },
  advanced: { bg: "bg-red-100", text: "text-red-700", label: "Advanced" },
};

const NODE_ICON_MAP: Record<string, string> = {
  "ai-agent": "Brain",
  "entry-point": "Play",
  approval: "CheckCircle2",
  "if-condition": "GitFork",
  "switch-case": "GitBranch",
  "sla-monitor": "Timer",
  "audit-log": "ClipboardList",
  "task-assigner": "Users",
  escalation: "AlertTriangle",
  "document-generator": "FileOutput",
  "form-input": "ClipboardList",
  "data-enrichment": "Search",
  "slack-send": "MessageSquare",
  "email-send": "Mail",
  "http-request": "Globe",
  delay: "Clock",
  "error-handler": "ShieldAlert",
  loop: "RefreshCw",
  "text-transform": "FileText",
  "artifact-writer": "Archive",
  "webhook-response": "Send",
  "db-query": "Database",
};

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  onSelectTemplate,
  onImportTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplatePreview | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory =
        activeCategory === "all" || t.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, searchQuery]);

  const handleExportTemplate = (
    template: TemplatePreview,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    import("js-yaml").then((yaml) => {
      const yamlStr = yaml.dump(template, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      });
      const blob = new Blob([yamlStr], { type: "text/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.id}.yaml`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleImportYaml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const yaml = await import("js-yaml");
      const parsed = yaml.load(text) as TemplatePreview;

      if (!parsed.id || !parsed.name || !parsed.nodes) {
        setImportStatus({
          type: "error",
          message: "Invalid template: missing id, name, or nodes",
        });
        return;
      }

      setImportStatus({
        type: "success",
        message: `Imported "${parsed.name}" successfully!`,
      });
      if (onImportTemplate) {
        onImportTemplate(parsed);
      }
    } catch {
      setImportStatus({
        type: "error",
        message: "Failed to parse YAML file. Please check the format.",
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && onSelectTemplate) {
      onSelectTemplate(selectedTemplate);
    }
    setSelectedTemplate(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          Template Library
        </h2>
        <p className="text-slate-500 mt-2 text-lg">
          Ready-to-use workflow templates for enterprise automation
        </p>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:outline-none text-slate-700 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-purple-400 text-slate-600 hover:text-purple-600 transition-all"
          >
            <FileUp className="w-4 h-4" />
            <span className="text-sm font-medium">Import YAML</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleImportYaml}
            className="hidden"
          />
        </div>
      </div>

      {/* Import Status Toast */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
              importStatus.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {importStatus.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {importStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                  : "bg-white text-slate-600 border-2 border-slate-200 hover:border-purple-200 hover:text-purple-600"
              }`}
            >
              <CatIcon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Template Count */}
      <div className="mb-4 text-sm text-slate-500">
        {filteredTemplates.length} template
        {filteredTemplates.length !== 1 ? "s" : ""} found
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template) => {
            const Icon = resolveIcon(template.icon);
            const diff =
              DIFFICULTY_COLORS[template.preview?.difficulty || "beginner"];
            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedTemplate(template)}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-purple-400 hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${template.preview?.color || "#8b5cf6"}, ${template.preview?.color || "#8b5cf6"}dd)`,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors line-clamp-1">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.bg} ${diff.text}`}
                          >
                            {diff.label}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.preview?.estimatedTime || "5 min"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-grow">
                    {template.description}
                  </p>

                  {/* Mini Workflow Preview */}
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {template.nodes?.slice(0, 5).map((node, idx) => {
                        const iconName =
                          NODE_ICON_MAP[node.type] || "Zap";
                        const NodeIcon = resolveIcon(iconName);
                        return (
                          <React.Fragment key={node.id}>
                            <div
                              className="flex flex-col items-center min-w-0"
                              title={node.name}
                            >
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                <NodeIcon className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                              <span className="text-[9px] text-slate-400 mt-1 truncate max-w-[50px]">
                                {node.name}
                              </span>
                            </div>
                            {idx <
                              Math.min(template.nodes.length, 5) - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-300 shrink-0 mx-0.5" />
                            )}
                          </React.Fragment>
                        );
                      })}
                      {template.nodes?.length > 5 && (
                        <span className="text-xs text-slate-400 ml-1">
                          +{template.nodes.length - 5}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {template.tags?.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template);
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
                    >
                      <Play className="w-4 h-4" />
                      Use Template
                    </button>
                    <button
                      onClick={(e) => handleExportTemplate(template, e)}
                      className="p-2.5 rounded-xl border-2 border-slate-200 hover:border-purple-300 text-slate-500 hover:text-purple-600 transition-all"
                      title="Export as YAML"
                    >
                      <FileDown className="w-4 h-4" />
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
          <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            No templates found
          </h3>
          <p className="text-slate-500">
            Try adjusting your search or category filter
          </p>
        </div>
      )}

      {/* Template Detail Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const Icon = resolveIcon(selectedTemplate.icon);
                const diff =
                  DIFFICULTY_COLORS[
                    selectedTemplate.preview?.difficulty || "beginner"
                  ];
                return (
                  <div className="p-8">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${selectedTemplate.preview?.color || "#8b5cf6"}, ${selectedTemplate.preview?.color || "#8b5cf6"}dd)`,
                          }}
                        >
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800">
                            {selectedTemplate.name}
                          </h2>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${diff.bg} ${diff.text}`}
                            >
                              {diff.label}
                            </span>
                            <span className="text-sm text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {selectedTemplate.preview?.estimatedTime ||
                                "5 min setup"}
                            </span>
                            <span className="text-sm text-slate-400">
                              {selectedTemplate.nodes?.length || 0} steps
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 mb-6 leading-relaxed">
                      {selectedTemplate.description}
                    </p>

                    {/* Use Cases */}
                    {selectedTemplate.preview?.useCases && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Use Cases
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedTemplate.preview.useCases.map((uc, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm text-slate-600"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              {uc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow Steps */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Workflow Steps
                      </h3>
                      <div className="space-y-3">
                        {selectedTemplate.nodes?.map((node, idx) => (
                          <div key={node.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                {node.name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {node.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {selectedTemplate.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleUseTemplate}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                      >
                        <Play className="w-5 h-5" />
                        Use This Template
                      </button>
                      <button
                        onClick={(e) =>
                          handleExportTemplate(selectedTemplate, e)
                        }
                        className="px-6 py-3 rounded-xl border-2 border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-600 transition-all flex items-center gap-2 font-medium"
                      >
                        <FileDown className="w-5 h-5" />
                        Export YAML
                      </button>
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
