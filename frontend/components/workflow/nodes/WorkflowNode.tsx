import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import {
  Zap, Globe, Clock, FileText, Brain, GitBranch,
  Mail, GitFork, RefreshCw, CheckCircle2,
  Database, Archive, Send, ShieldAlert, Github, Calendar, Video, Table2,
  Timer, AlertTriangle, Users, Search, FileOutput, ClipboardList,
} from 'lucide-react';
import { SlackLogo } from '../icons/ServiceLogos';

// Node type data interface
type WorkflowNodeData = {
  nodeType?: string;
  type?: string;
  category?: string;
  label?: string;
  description?: string;
  config?: Record<string, any>;
  selected?: boolean;
  runStatus?: string;
  hasValidationError?: boolean;
  [key: string]: unknown;
};

type WorkflowNodeType = Node<WorkflowNodeData>;

const NODE_ICONS: Record<string, React.ElementType> = {
  'entry-point': Zap,
  'http-request': Globe,
  'slack-send': SlackLogo,
  'email-send': Mail,
  'db-query': Database,
  'if-condition': GitFork,
  'switch-case': GitBranch,
  'loop': RefreshCw,
  'ai-agent': Brain,
  'text-transform': FileText,
  'delay': Clock,
  'error-handler': ShieldAlert,
  'approval': CheckCircle2,
  'artifact-writer': Archive,
  'webhook-response': Send,
  github: Github,
  'google-calendar': Calendar,
  'google-meet': Video,
  'google-docs': FileText,
  'google-sheets': Table2,
  'sla-monitor': Timer,
  'audit-log': ClipboardList,
  'task-assigner': Users,
  'escalation': AlertTriangle,
  'data-enrichment': Search,
  'document-generator': FileOutput,
  'form-input': ClipboardList,
};

const NODE_COLORS: Record<string, string> = {
  'input': '#f59e0b',
  'integration': '#3b82f6',
  'ai': '#8b5cf6',
  'logic': '#10b981',
  'control': '#6b7280',
  'output': 'hsl(var(--primary))',
};

const CATEGORY_FOR_TYPE: Record<string, string> = {
  'entry-point': 'input',
  'http-request': 'integration',
  'slack-send': 'integration',
  'email-send': 'integration',
  'db-query': 'integration',
  'if-condition': 'logic',
  'switch-case': 'logic',
  'loop': 'logic',
  'ai-agent': 'ai',
  'text-transform': 'ai',
  'delay': 'control',
  'error-handler': 'control',
  'approval': 'control',
  'artifact-writer': 'output',
  'webhook-response': 'output',
  github: 'integration',
  'google-calendar': 'integration',
  'google-meet': 'integration',
  'google-docs': 'integration',
  'google-sheets': 'integration',
  'sla-monitor': 'control',
  'audit-log': 'output',
  'task-assigner': 'control',
  'escalation': 'control',
  'data-enrichment': 'ai',
  'document-generator': 'output',
  'form-input': 'input',
  'chat-model': 'ai',
  'agent-memory': 'ai',
  'agent-tool': 'ai',
};

const WorkflowNode: React.FC<NodeProps<WorkflowNodeType>> = ({ data, isConnectable }) => {
  const nodeType = (data.nodeType || data.type || '') as string;
  const category = (data.category || CATEGORY_FOR_TYPE[nodeType] || 'tool') as string;
  const Icon = NODE_ICONS[nodeType] || Zap;
  const color = NODE_COLORS[category] || '#6b7280';
  const label = (data.label || data.config?.name || nodeType || 'Node') as string;
  const description = (data.description as string) || category.replace('-', ' ');
  const isTrigger = category === 'input';
  const isConfigured = Boolean(data.config && Object.keys(data.config).length > 0);

  const hasError = data.hasValidationError === true;
  const isUnconfigured = !data.config || Object.keys(data.config as Record<string, any>).length === 0;
  const showUnconfiguredWarning = isUnconfigured && !isTrigger;

  // Border color logic
  const borderColor = hasError
    ? '#ef4444'
    : data.selected
      ? color
      : showUnconfiguredWarning
        ? '#f59e0b'
        : `${color}50`;

  // Box shadow logic
  const boxShadow = hasError
    ? '0 0 0 2px rgba(239,68,68,0.25), 0 1px 4px rgba(0,0,0,0.08)'
    : data.selected
      ? `0 0 0 2px ${color}40, 0 4px 16px rgba(0,0,0,0.12)`
      : showUnconfiguredWarning
        ? '0 0 0 1px rgba(245,158,11,0.15), 0 1px 4px rgba(0,0,0,0.08)'
        : '0 1px 4px rgba(0,0,0,0.08)';

  return (
    <div
      className="relative rounded-2xl border bg-white dark:bg-[var(--bg-card)] transition-all w-[220px] flex items-center gap-3 px-3 py-2.5 hover:shadow-md cursor-pointer"
      style={{
        borderColor,
        boxShadow,
        background: data.selected
          ? 'white'
          : undefined,
      }}
    >
      {/* Validation error indicator */}
      {hasError && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-10 shadow-sm">
          <AlertTriangle className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Unconfigured warning dot */}
      {!hasError && showUnconfiguredWarning && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 z-10 shadow-sm" />
      )}

      {/* Target handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !border-white dark:!border-[var(--bg-card)]"
          style={{ background: color }}
          isConnectable={isConnectable}
        />
      )}

      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate leading-tight">
          {label}
        </h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 capitalize">
          {description}
        </p>
      </div>

      {/* Configured indicator */}
      {isConfigured && (
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      )}

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !border-2 !border-white dark:!border-[var(--bg-card)]"
        style={{ background: color }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default WorkflowNode;
