// Template type definitions and registry for YAML-based workflow templates

export interface WorkflowTemplate {
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
    condition?: string;
  }>;
}

// Template file names for dynamic loading
export const TEMPLATE_FILES = [
  "procurement-to-payment",
  "employee-onboarding",
  "contract-lifecycle",
  "meeting-intelligence",
  "multi-agent-collaboration",
  "workflow-health-monitor",
  "customer-support",
  "incident-management",
  "sales-outreach",
] as const;

export type TemplateId = (typeof TEMPLATE_FILES)[number];
