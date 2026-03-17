import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import {
  Zap, Globe, Clock, FileText, Brain, GitBranch, Shield,
  MessageSquare, Mail, Database, RotateCcw, Activity,
  Timer, Pause, AlertCircle
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
  WEBHOOK_TRIGGER: Globe,
  SCHEDULE_TRIGGER: Clock,
  FILE_UPLOAD_TRIGGER: FileText,
  API_TRIGGER: Globe,
  EXTRACTION_AGENT: Brain,
  SUMMARIZATION_AGENT: FileText,
  CLASSIFICATION_AGENT: GitBranch,
  REASONING_AGENT: Brain,
  DECISION_AGENT: GitBranch,
  VERIFICATION_AGENT: Shield,
  COMPLIANCE_AGENT: Shield,
  IF_CONDITION: GitBranch,
  LOOP: RotateCcw,
  PARALLEL: Activity,
  SLACK_SEND: MessageSquare,
  EMAIL_SEND: Mail,
  HTTP_REQUEST: Globe,
  API_CALL: Globe,
  DB_WRITE: Database,
  DELAY: Timer,
  APPROVAL: Pause,
  RETRY: RotateCcw,
  ERROR_HANDLER: AlertCircle,
};

const NODE_COLORS: Record<string, string> = {
  TRIGGER: '#f59e0b',
  AI_AGENT: '#6366f1',
  LOGIC: '#06b6d4',
  ACTION: '#10b981',
  CONTROL: '#6b7280',
};

const CATEGORY_FOR_TYPE: Record<string, string> = {
  WEBHOOK_TRIGGER: 'TRIGGER', SCHEDULE_TRIGGER: 'TRIGGER', FILE_UPLOAD_TRIGGER: 'TRIGGER', API_TRIGGER: 'TRIGGER',
  EXTRACTION_AGENT: 'AI_AGENT', SUMMARIZATION_AGENT: 'AI_AGENT', CLASSIFICATION_AGENT: 'AI_AGENT',
  REASONING_AGENT: 'AI_AGENT', DECISION_AGENT: 'AI_AGENT', VERIFICATION_AGENT: 'AI_AGENT', COMPLIANCE_AGENT: 'AI_AGENT',
  IF_CONDITION: 'LOGIC', LOOP: 'LOGIC', PARALLEL: 'LOGIC',
  SLACK_SEND: 'ACTION', EMAIL_SEND: 'ACTION', HTTP_REQUEST: 'ACTION', API_CALL: 'ACTION', DB_WRITE: 'ACTION',
  DELAY: 'CONTROL', APPROVAL: 'CONTROL', RETRY: 'CONTROL', ERROR_HANDLER: 'CONTROL',
};

const WorkflowNode: React.FC<NodeProps<WorkflowNodeType>> = ({ data, isConnectable }) => {
  const nodeType = (data.nodeType || data.type || '') as string;
  const category = (data.category || CATEGORY_FOR_TYPE[nodeType] || 'ACTION') as string;
  const Icon = NODE_ICONS[nodeType] || Zap;
  const color = NODE_COLORS[category] || '#6b7280';
  const label = (data.label || data.config?.name || nodeType || 'Node') as string;
  const description = data.description as string || category.replace('_', ' ');
  const isTrigger = category === 'TRIGGER';
  const isConfigured = Boolean(data.config && Object.keys(data.config).length > 0);

  return (
    <div
      className="rounded-xl border-2 bg-white dark:bg-[#1e1e2e] transition-all w-[240px] flex items-center p-3"
      style={{
        borderColor: data.selected ? '#6366f1' : `${color}40`,
        boxShadow: data.selected ? `0 0 16px ${color}30` : '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Target handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !border-2 !border-white dark:!border-[#1e1e2e]"
          style={{ background: color }}
          isConnectable={isConnectable}
        />
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mr-3"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {label}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {description}
        </p>
      </div>

      {/* Configured indicator */}
      {isConfigured && (
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" />
      )}

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white dark:!border-[#1e1e2e]"
        style={{ background: color }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default WorkflowNode;
