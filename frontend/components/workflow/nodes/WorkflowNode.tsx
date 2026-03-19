import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import {
  Zap, Globe, Clock, FileText, Brain, GitBranch, Shield,
  MessageSquare, Mail, File, Users, RotateCcw, Hourglass,
  PauseCircle, ShieldCheck, CheckCircle2, Upload, Webhook,
  Tag, Search, GitFork, RefreshCw,
} from 'lucide-react';

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
  [key: string]: unknown;
};

type WorkflowNodeType = Node<WorkflowNodeData>;

const NODE_ICONS: Record<string, React.ElementType> = {
  'webhook-trigger': Webhook,
  'file-upload': Upload,
  'api-trigger': Globe,
  'scheduled-trigger': Clock,
  'summarization-agent': FileText,
  'classification-agent': Tag,
  'extraction-agent': Search,
  'reasoning-agent': Brain,
  'decision-agent': GitBranch,
  'slack': MessageSquare,
  'gmail': Mail,
  'notion': File,
  'crm': Users,
  'webhook-action': Globe,
  'condition': GitFork,
  'loop': RefreshCw,
  'branch': GitBranch,
  'approval': ShieldCheck,
  'delay': Hourglass,
  'verification': CheckCircle2,
};

const NODE_COLORS: Record<string, string> = {
  'trigger': '#f59e0b',
  'ai-agent': '#8b5cf6',
  'tool': '#3b82f6',
  'logic': '#10b981',
  'control': '#6b7280',
};

const CATEGORY_FOR_TYPE: Record<string, string> = {
  'webhook-trigger': 'trigger',
  'file-upload': 'trigger',
  'api-trigger': 'trigger',
  'scheduled-trigger': 'trigger',
  'summarization-agent': 'ai-agent',
  'classification-agent': 'ai-agent',
  'extraction-agent': 'ai-agent',
  'reasoning-agent': 'ai-agent',
  'decision-agent': 'ai-agent',
  'slack': 'tool',
  'gmail': 'tool',
  'notion': 'tool',
  'crm': 'tool',
  'webhook-action': 'tool',
  'condition': 'logic',
  'loop': 'logic',
  'branch': 'logic',
  'approval': 'control',
  'delay': 'control',
  'verification': 'control',
};

const WorkflowNode: React.FC<NodeProps<WorkflowNodeType>> = ({ data, isConnectable }) => {
  const nodeType = (data.nodeType || data.type || '') as string;
  const category = (data.category || CATEGORY_FOR_TYPE[nodeType] || 'tool') as string;
  const Icon = NODE_ICONS[nodeType] || Zap;
  const color = NODE_COLORS[category] || '#6b7280';
  const label = (data.label || data.config?.name || nodeType || 'Node') as string;
  const description = (data.description as string) || category.replace('-', ' ');
  const isTrigger = category === 'trigger';
  const isConfigured = Boolean(data.config && Object.keys(data.config).length > 0);

  return (
    <div
      className="rounded-2xl border bg-white dark:bg-[#1e1e2e] transition-all w-[220px] flex items-center gap-3 px-3 py-2.5"
      style={{
        borderColor: data.selected ? color : `${color}50`,
        boxShadow: data.selected
          ? `0 0 0 2px ${color}40, 0 4px 16px rgba(0,0,0,0.12)`
          : '0 1px 4px rgba(0,0,0,0.08)',
        background: data.selected
          ? `linear-gradient(135deg, white 0%, ${color}08 100%)`
          : undefined,
      }}
    >
      {/* Target handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#1e1e2e]"
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
        className="!w-2.5 !h-2.5 !border-2 !border-white dark:!border-[#1e1e2e]"
        style={{ background: color }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default WorkflowNode;
