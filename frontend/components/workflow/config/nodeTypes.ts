import {
  Zap,
  Upload,
  Webhook,
  Clock,
  Brain,
  FileText,
  Tag,
  Search,
  GitBranch,
  MessageSquare,
  Mail,
  File,
  Users,
  WebhookIcon as WebhookAction,
  GitFork,
  RefreshCw,
  PauseCircle,
  ShieldCheck,
  Hourglass,
  CheckCircle2,
} from "lucide-react";

export type NodeCategory =
  | "trigger"
  | "ai-agent"
  | "tool"
  | "logic"
  | "control";

export interface NodeTypeConfig {
  id: string;
  name: string;
  category: NodeCategory;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  requiresConfig: boolean;
  exampleWorkflows?: string[];
}

export const NODE_CATEGORIES: Record<
  NodeCategory,
  {
    name: string;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  trigger: {
    name: "Triggers",
    description: "Start your workflow with these events",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
  },
  "ai-agent": {
    name: "AI Agents",
    description: "Intelligent processing and analysis",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
  },
  tool: {
    name: "Tools",
    description: "Connect to external services",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
  },
  logic: {
    name: "Logic",
    description: "Control flow and conditions",
    color: "#10b981",
    bgColor: "bg-emerald-50",
  },
  control: {
    name: "Control",
    description: "Manage workflow execution",
    color: "#6b7280",
    bgColor: "bg-gray-50",
  },
};

export const NODE_TYPES: Record<string, NodeTypeConfig> = {
  // Trigger Nodes
  "webhook-trigger": {
    id: "webhook-trigger",
    name: "Webhook Trigger",
    category: "trigger",
    icon: Webhook,
    description: "Start workflow when a webhook is received",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Customer Support Automation", "Sales Outreach"],
  },
  "file-upload": {
    id: "file-upload",
    name: "File Upload",
    category: "trigger",
    icon: Upload,
    description: "Trigger when a file is uploaded",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Document Processing"],
  },
  "api-trigger": {
    id: "api-trigger",
    name: "API Trigger",
    category: "trigger",
    icon: Webhook,
    description: "Start workflow via API call",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Custom Integrations"],
  },
  "scheduled-trigger": {
    id: "scheduled-trigger",
    name: "Scheduled Trigger",
    category: "trigger",
    icon: Clock,
    description: "Run on a schedule (cron)",
    color: "#f59e0b",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-400",
    requiresConfig: true,
    exampleWorkflows: ["Daily Reports", "Maintenance Tasks"],
  },

  // AI Agent Nodes
  "summarization-agent": {
    id: "summarization-agent",
    name: "Summarization Agent",
    category: "ai-agent",
    icon: FileText,
    description: "Summarize text, documents, or transcripts",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Document Processing"],
  },
  "classification-agent": {
    id: "classification-agent",
    name: "Classification Agent",
    category: "ai-agent",
    icon: Tag,
    description: "Categorize and classify content",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Customer Support Automation", "Lead Qualification"],
  },
  "extraction-agent": {
    id: "extraction-agent",
    name: "Extraction Agent",
    category: "ai-agent",
    icon: Search,
    description: "Extract specific information from text",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Meeting Intelligence", "Data Processing"],
  },
  "reasoning-agent": {
    id: "reasoning-agent",
    name: "Reasoning Agent",
    category: "ai-agent",
    icon: Brain,
    description: "Apply logic and reasoning to make decisions",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Complex Decision Making", "Analysis Workflows"],
  },
  "decision-agent": {
    id: "decision-agent",
    name: "Decision Agent",
    category: "ai-agent",
    icon: GitBranch,
    description: "Make automated decisions based on context",
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    requiresConfig: true,
    exampleWorkflows: ["Lead Scoring", "Routing Decisions"],
  },

  // Tool Nodes
  slack: {
    id: "slack",
    name: "Slack",
    category: "tool",
    icon: MessageSquare,
    description: "Send messages, create channels, manage teams",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Team Notifications", "Task Management"],
  },
  gmail: {
    id: "gmail",
    name: "Gmail",
    category: "tool",
    icon: Mail,
    description: "Send emails, manage labels, organize inbox",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Email Automation", "Customer Communication"],
  },
  notion: {
    id: "notion",
    name: "Notion",
    category: "tool",
    icon: File,
    description: "Create pages, databases, manage knowledge",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Documentation", "Project Management"],
  },
  crm: {
    id: "crm",
    name: "CRM",
    category: "tool",
    icon: Users,
    description: "Manage contacts, deals, and customer data",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["Sales Outreach", "Lead Management"],
  },
  "webhook-action": {
    id: "webhook-action",
    name: "Webhook Action",
    category: "tool",
    icon: WebhookAction,
    description: "Make HTTP requests to any endpoint",
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    requiresConfig: true,
    exampleWorkflows: ["API Integrations", "Data Sync"],
  },

  // Logic Nodes
  condition: {
    id: "condition",
    name: "Condition",
    category: "logic",
    icon: GitFork,
    description: "Branch workflow based on conditions",
    color: "#10b981",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    requiresConfig: true,
    exampleWorkflows: ["Conditional Workflows", "Routing"],
  },
  loop: {
    id: "loop",
    name: "Loop",
    category: "logic",
    icon: RefreshCw,
    description: "Repeat actions for multiple items",
    color: "#10b981",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    requiresConfig: true,
    exampleWorkflows: ["Batch Processing", "List Operations"],
  },
  branch: {
    id: "branch",
    name: "Branch",
    category: "logic",
    icon: GitBranch,
    description: "Split workflow into multiple paths",
    color: "#10b981",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    requiresConfig: true,
    exampleWorkflows: ["Parallel Processing", "Multi-channel Output"],
  },

  // Control Nodes
  approval: {
    id: "approval",
    name: "Approval",
    category: "control",
    icon: ShieldCheck,
    description: "Require human approval before proceeding",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Quality Control", "Compliance"],
  },
  delay: {
    id: "delay",
    name: "Delay",
    category: "control",
    icon: Hourglass,
    description: "Pause workflow for a specified time",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Rate Limiting", "Scheduled Follow-ups"],
  },
  verification: {
    id: "verification",
    name: "Verification",
    category: "control",
    icon: CheckCircle2,
    description: "Verify conditions before continuing",
    color: "#6b7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    requiresConfig: true,
    exampleWorkflows: ["Data Validation", "Quality Checks"],
  },
};

export const getNodesByCategory = (
  category: NodeCategory,
): NodeTypeConfig[] => {
  return Object.values(NODE_TYPES).filter((node) => node.category === category);
};

export const getNodeById = (id: string): NodeTypeConfig | undefined => {
  return NODE_TYPES[id];
};

export const getAllNodeTypes = (): NodeTypeConfig[] => {
  return Object.values(NODE_TYPES);
};

// Config field types
export type ConfigFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "boolean"
  | "password"
  | "json"
  | "api-key"
  | "email"
  | "url"
  | "multi-select"
  | "code";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  description?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  rows?: number;
}

// Component-specific config schemas
export const NODE_CONFIG_SCHEMA: Record<string, ConfigField[]> = {
  // Webhook Trigger
  "webhook-trigger": [
    {
      key: "webhookPath",
      label: "Webhook Path",
      type: "text",
      placeholder: "/my-webhook",
      required: true,
      description: "The path where webhook events will be received",
    },
    {
      key: "method",
      label: "HTTP Method",
      type: "select",
      defaultValue: "POST",
      required: true,
      options: [
        { value: "GET", label: "GET" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "DELETE", label: "DELETE" },
      ],
    },
    {
      key: "secret",
      label: "Webhook Secret (Optional)",
      type: "password",
      placeholder: "Enter secret key for verification",
      description: "Used to verify webhook authenticity",
    },
  ],

  // File Upload
  "file-upload": [
    {
      key: "allowedTypes",
      label: "Allowed File Types",
      type: "multi-select",
      defaultValue: ["pdf", "doc", "docx", "txt"],
      required: true,
      options: [
        { value: "pdf", label: "PDF" },
        { value: "doc", label: "Word Document" },
        { value: "docx", label: "Word Document (.docx)" },
        { value: "txt", label: "Text File" },
        { value: "csv", label: "CSV" },
        { value: "json", label: "JSON" },
        { value: "md", label: "Markdown" },
      ],
      description: "Select which file types can be uploaded",
    },
    {
      key: "maxSizeMB",
      label: "Max File Size (MB)",
      type: "number",
      defaultValue: 10,
      min: 1,
      max: 100,
      required: true,
    },
  ],

  // API Trigger
  "api-trigger": [
    {
      key: "endpoint",
      label: "API Endpoint",
      type: "text",
      placeholder: "/api/trigger",
      required: true,
      description: "The endpoint that will trigger the workflow",
    },
    {
      key: "authentication",
      label: "Authentication Method",
      type: "select",
      defaultValue: "none",
      options: [
        { value: "none", label: "None" },
        { value: "api-key", label: "API Key" },
        { value: "bearer", label: "Bearer Token" },
        { value: "basic", label: "Basic Auth" },
      ],
    },
    {
      key: "apiKey",
      label: "API Key / Token",
      type: "api-key",
      placeholder: "Enter your API key",
      description: "Required if authentication is enabled",
    },
  ],

  // Scheduled Trigger
  "scheduled-trigger": [
    {
      key: "cronExpression",
      label: "Cron Expression",
      type: "text",
      placeholder: "0 0 * * *",
      required: true,
      description:
        "Standard cron format (e.g., 0 0 * * * for daily at midnight)",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "select",
      defaultValue: "UTC",
      required: true,
      options: [
        { value: "UTC", label: "UTC" },
        { value: "America/New_York", label: "Eastern Time" },
        { value: "America/Los_Angeles", label: "Pacific Time" },
        { value: "Europe/London", label: "London" },
        { value: "Asia/Kolkata", label: "India" },
        { value: "Asia/Tokyo", label: "Tokyo" },
        { value: "Australia/Sydney", label: "Sydney" },
      ],
    },
  ],

  // Summarization Agent
  "summarization-agent": [
    {
      key: "model",
      label: "AI Model",
      type: "select",
      defaultValue: "gpt-4",
      required: true,
      options: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        { value: "claude-3-opus", label: "Claude 3 Opus" },
        { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
      ],
    },
    {
      key: "maxLength",
      label: "Max Summary Length",
      type: "number",
      defaultValue: 500,
      min: 50,
      max: 5000,
      description: "Maximum number of words in the summary",
    },
    {
      key: "style",
      label: "Summary Style",
      type: "select",
      defaultValue: "concise",
      options: [
        { value: "concise", label: "Concise" },
        { value: "detailed", label: "Detailed" },
        { value: "bullet-points", label: "Bullet Points" },
        { value: "executive", label: "Executive Summary" },
      ],
    },
    {
      key: "customPrompt",
      label: "Custom Instructions (Optional)",
      type: "textarea",
      rows: 3,
      placeholder: "Add any specific instructions for the summarization...",
      description: "Customize how the AI should approach the summarization",
    },
  ],

  // Classification Agent
  "classification-agent": [
    {
      key: "model",
      label: "AI Model",
      type: "select",
      defaultValue: "gpt-4",
      required: true,
      options: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        { value: "claude-3-opus", label: "Claude 3 Opus" },
        { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
      ],
    },
    {
      key: "categories",
      label: "Categories",
      type: "multi-select",
      required: true,
      defaultValue: [],
      options: [
        { value: "high-priority", label: "High Priority" },
        { value: "medium-priority", label: "Medium Priority" },
        { value: "low-priority", label: "Low Priority" },
        { value: "urgent", label: "Urgent" },
        { value: "bug", label: "Bug Report" },
        { value: "feature-request", label: "Feature Request" },
        { value: "question", label: "Question" },
        { value: "feedback", label: "Feedback" },
      ],
      description: "Define the categories for classification",
    },
    {
      key: "customCategories",
      label: "Add Custom Categories (comma-separated)",
      type: "text",
      placeholder: "Category 1, Category 2, Category 3",
      description: "Add additional categories separated by commas",
    },
  ],

  // Extraction Agent
  "extraction-agent": [
    {
      key: "model",
      label: "AI Model",
      type: "select",
      defaultValue: "gpt-4",
      required: true,
      options: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        { value: "claude-3-opus", label: "Claude 3 Opus" },
        { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
      ],
    },
    {
      key: "fieldsToExtract",
      label: "Fields to Extract",
      type: "text",
      placeholder: "name, email, phone, address, company",
      required: true,
      description: "Comma-separated list of fields to extract from the text",
    },
    {
      key: "outputFormat",
      label: "Output Format",
      type: "select",
      defaultValue: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "csv", label: "CSV" },
        { value: "key-value", label: "Key-Value Pairs" },
      ],
    },
  ],

  // Reasoning Agent
  "reasoning-agent": [
    {
      key: "model",
      label: "AI Model",
      type: "select",
      defaultValue: "gpt-4",
      required: true,
      options: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "claude-3-opus", label: "Claude 3 Opus" },
      ],
    },
    {
      key: "prompt",
      label: "Reasoning Prompt",
      type: "textarea",
      rows: 4,
      placeholder:
        "Describe the reasoning task and what decisions should be made...",
      required: true,
      description: "Provide instructions for the AI reasoning process",
    },
    {
      key: "contextWindow",
      label: "Context Window",
      type: "select",
      defaultValue: "medium",
      options: [
        { value: "small", label: "Small (2K tokens)" },
        { value: "medium", label: "Medium (8K tokens)" },
        { value: "large", label: "Large (32K tokens)" },
      ],
    },
  ],

  // Decision Agent
  "decision-agent": [
    {
      key: "model",
      label: "AI Model",
      type: "select",
      defaultValue: "gpt-4",
      required: true,
      options: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "claude-3-opus", label: "Claude 3 Opus" },
      ],
    },
    {
      key: "decisionCriteria",
      label: "Decision Criteria",
      type: "textarea",
      rows: 3,
      placeholder: "Define the criteria for making decisions...",
      required: true,
      description: "What factors should influence the decision?",
    },
    {
      key: "possibleOutcomes",
      label: "Possible Outcomes",
      type: "text",
      placeholder: "approve, reject, escalate",
      required: true,
      description: "Comma-separated list of possible outcomes",
    },
  ],

  // Slack
  slack: [
    {
      key: "webhookUrl",
      label: "Slack Webhook URL",
      type: "url",
      placeholder: "https://hooks.slack.com/services/...",
      required: true,
      description: "Create an incoming webhook in Slack",
    },
    {
      key: "channel",
      label: "Channel (Optional)",
      type: "text",
      placeholder: "#general",
      description: "Override the default webhook channel",
    },
    {
      key: "messageTemplate",
      label: "Message Template",
      type: "textarea",
      rows: 4,
      placeholder: "Hello! Here is the information: {{data}}",
      required: true,
      description: "Use {{data}} to reference workflow data",
    },
    {
      key: "username",
      label: "Bot Username (Optional)",
      type: "text",
      placeholder: "Workflow Bot",
    },
  ],

  // Gmail
  gmail: [
    {
      key: "to",
      label: "To",
      type: "email",
      placeholder: "recipient@example.com",
      required: true,
      description:
        "Recipient email address (use {{variable}} for dynamic values)",
    },
    {
      key: "subject",
      label: "Subject",
      type: "text",
      placeholder: "Email subject line",
      required: true,
    },
    {
      key: "body",
      label: "Email Body",
      type: "textarea",
      rows: 6,
      placeholder: "Write your email content here...",
      required: true,
    },
    {
      key: "cc",
      label: "CC (Optional)",
      type: "email",
      placeholder: "cc@example.com",
    },
    {
      key: "bcc",
      label: "BCC (Optional)",
      type: "email",
      placeholder: "bcc@example.com",
    },
  ],

  // Notion
  notion: [
    {
      key: "apiKey",
      label: "Notion API Key",
      type: "api-key",
      placeholder: "secret_...",
      required: true,
      description: "Create an integration at notion.com/my-integrations",
    },
    {
      key: "databaseId",
      label: "Database ID",
      type: "text",
      placeholder: "32-character database ID",
      required: true,
      description: "Found in the database URL",
    },
    {
      key: "pageProperties",
      label: "Page Properties (JSON)",
      type: "json",
      placeholder: '{"Name": {"title": [{"text": {"content": "{{name}}"}}]}}',
      required: true,
      description: "JSON structure for the page properties",
    },
  ],

  // CRM
  crm: [
    {
      key: "crmProvider",
      label: "CRM Provider",
      type: "select",
      defaultValue: "hubspot",
      required: true,
      options: [
        { value: "hubspot", label: "HubSpot" },
        { value: "salesforce", label: "Salesforce" },
        { value: "pipedrive", label: "Pipedrive" },
      ],
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "api-key",
      placeholder: "Enter your CRM API key",
      required: true,
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      defaultValue: "create",
      required: true,
      options: [
        { value: "create", label: "Create Record" },
        { value: "update", label: "Update Record" },
        { value: "search", label: "Search Records" },
        { value: "delete", label: "Delete Record" },
      ],
    },
    {
      key: "objectType",
      label: "Object Type",
      type: "select",
      defaultValue: "contact",
      required: true,
      options: [
        { value: "contact", label: "Contact" },
        { value: "company", label: "Company" },
        { value: "deal", label: "Deal" },
        { value: "lead", label: "Lead" },
      ],
    },
    {
      key: "dataMapping",
      label: "Data Mapping (JSON)",
      type: "json",
      placeholder: '{"name": "{{name}}", "email": "{{email}}"}',
      required: true,
      description: "Map workflow data to CRM fields",
    },
  ],

  // Webhook Action
  "webhook-action": [
    {
      key: "url",
      label: "Endpoint URL",
      type: "url",
      placeholder: "https://api.example.com/endpoint",
      required: true,
    },
    {
      key: "method",
      label: "HTTP Method",
      type: "select",
      defaultValue: "POST",
      required: true,
      options: [
        { value: "GET", label: "GET" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "PATCH", label: "PATCH" },
        { value: "DELETE", label: "DELETE" },
      ],
    },
    {
      key: "headers",
      label: "Headers (JSON)",
      type: "json",
      placeholder:
        '{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}',
      description: "Custom headers for the request",
    },
    {
      key: "body",
      label: "Request Body (JSON)",
      type: "json",
      placeholder: '{"data": "{{workflowData}}"}',
      description: "JSON body for POST/PUT/PATCH requests",
    },
  ],

  // Condition
  condition: [
    {
      key: "condition",
      label: "Condition Expression",
      type: "text",
      placeholder: '{{field}} == "value"',
      required: true,
      description: "Use JavaScript-like expressions with {{variables}}",
    },
    {
      key: "trueLabel",
      label: "True Branch Label",
      type: "text",
      placeholder: "Yes / True",
      defaultValue: "True",
    },
    {
      key: "falseLabel",
      label: "False Branch Label",
      type: "text",
      placeholder: "No / False",
      defaultValue: "False",
    },
  ],

  // Loop
  loop: [
    {
      key: "dataSource",
      label: "Data Source",
      type: "text",
      placeholder: "{{items}}",
      required: true,
      description: "The array or list to iterate over",
    },
    {
      key: "maxIterations",
      label: "Max Iterations",
      type: "number",
      defaultValue: 100,
      min: 1,
      max: 10000,
      description: "Maximum number of loop iterations (safety limit)",
    },
  ],

  // Branch
  branch: [
    {
      key: "branchCount",
      label: "Number of Branches",
      type: "number",
      defaultValue: 2,
      min: 2,
      max: 10,
      required: true,
    },
    {
      key: "branchNames",
      label: "Branch Names (comma-separated)",
      type: "text",
      placeholder: "Branch A, Branch B, Branch C",
      defaultValue: "Branch A, Branch B",
    },
  ],

  // Approval
  approval: [
    {
      key: "approverEmail",
      label: "Approver Email",
      type: "email",
      placeholder: "approver@example.com",
      required: true,
    },
    {
      key: "timeoutMinutes",
      label: "Timeout (minutes)",
      type: "number",
      defaultValue: 60,
      min: 5,
      max: 1440,
      required: true,
      description: "Time to wait for approval before timing out",
    },
    {
      key: "approvalMessage",
      label: "Approval Message",
      type: "textarea",
      rows: 3,
      placeholder: "Please review and approve this workflow step...",
      required: true,
    },
    {
      key: "onTimeout",
      label: "On Timeout",
      type: "select",
      defaultValue: "reject",
      options: [
        { value: "reject", label: "Reject (Continue with false path)" },
        { value: "skip", label: "Skip (Continue with true path)" },
        { value: "escalate", label: "Escalate to another approver" },
      ],
    },
  ],

  // Delay
  delay: [
    {
      key: "duration",
      label: "Duration",
      type: "number",
      defaultValue: 5,
      min: 1,
      max: 10080,
      required: true,
    },
    {
      key: "unit",
      label: "Time Unit",
      type: "select",
      defaultValue: "minutes",
      required: true,
      options: [
        { value: "seconds", label: "Seconds" },
        { value: "minutes", label: "Minutes" },
        { value: "hours", label: "Hours" },
        { value: "days", label: "Days" },
      ],
    },
  ],

  // Verification
  verification: [
    {
      key: "verificationType",
      label: "Verification Type",
      type: "select",
      defaultValue: "data-validation",
      required: true,
      options: [
        { value: "data-validation", label: "Data Validation" },
        { value: "quality-check", label: "Quality Check" },
        { value: "compliance-check", label: "Compliance Check" },
      ],
    },
    {
      key: "rules",
      label: "Validation Rules (JSON)",
      type: "json",
      placeholder: '{"email": {"required": true, "pattern": "^[^@]+@[^@]+$"}}',
      required: true,
      description: "Define validation rules as JSON",
    },
    {
      key: "errorMessage",
      label: "Error Message",
      type: "text",
      placeholder: "Validation failed: {{reason}}",
      defaultValue: "Validation failed",
    },
  ],
};

// Helper function to get config fields for a node type
export const getConfigFields = (nodeType: string): ConfigField[] => {
  return NODE_CONFIG_SCHEMA[nodeType] || [];
};

// Helper function to check if a node type requires config
export const requiresConfig = (nodeType: string): boolean => {
  const fields = getConfigFields(nodeType);
  return fields.length > 0;
};

// Example workflow templates
export const WORKFLOW_TEMPLATES = [
  {
    id: "meeting-intelligence",
    name: "Meeting Intelligence",
    description: "Automate meeting notes and task assignment",
    icon: Brain,
    steps: [
      "Trigger when transcript uploaded",
      "Extract tasks using NLP",
      "Assign owners using contextual analysis",
      "Create Slack tasks",
      "Verify completion",
    ],
    nodes: [
      "file-upload",
      "extraction-agent",
      "reasoning-agent",
      "slack",
      "verification",
    ],
  },
  {
    id: "customer-support",
    name: "Customer Support Automation",
    description: "Automate ticket classification and response",
    icon: MessageSquare,
    steps: [
      "Trigger when new ticket created",
      "Classify issue type",
      "Retrieve knowledge base articles",
      "Draft response",
      "Human approval",
      "Send email to customer",
    ],
    nodes: [
      "webhook-trigger",
      "classification-agent",
      "search",
      "reasoning-agent",
      "approval",
      "gmail",
    ],
  },
  {
    id: "sales-outreach",
    name: "Sales Outreach",
    description: "Automate lead qualification and email campaigns",
    icon: Mail,
    steps: [
      "Trigger when new lead added",
      "Research company",
      "Score lead quality",
      "Generate personalized email",
      "Send via Gmail",
    ],
    nodes: [
      "api-trigger",
      "search",
      "decision-agent",
      "reasoning-agent",
      "gmail",
    ],
  },
  {
    id: "incident-management",
    name: "Incident Management",
    description: "Automate alert handling and escalation",
    icon: ShieldCheck,
    steps: [
      "Trigger when system alert received",
      "Analyze logs",
      "Determine severity",
      "Create incident ticket",
      "Notify DevOps team",
    ],
    nodes: [
      "webhook-trigger",
      "extraction-agent",
      "classification-agent",
      "crm",
      "slack",
    ],
  },
];
