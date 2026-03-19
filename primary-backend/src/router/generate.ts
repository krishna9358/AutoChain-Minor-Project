import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";
import { getComponentById } from "./componentCatalog";

const router = Router();

// AI Workflow Generator
router.post("/workflow", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Simulate AI generation pipeline
    // In production, integrate with OpenAI/Claude/Gemini
    const generated = await generateWorkflowFromPrompt(prompt);

    res.json(generated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

interface GeneratedNode {
  tempId: string;
  componentId: string;
  nodeType: string;
  category: string;
  label: string;
  description: string;
  config: any;
  position: { x: number; y: number };
}

function catalogNode(
  tempId: string,
  componentId: string,
  label: string,
  description: string,
  config: any,
  position: { x: number; y: number },
): GeneratedNode {
  const def = getComponentById(componentId);
  return {
    tempId,
    componentId,
    nodeType: componentId,
    category: def?.category ?? "core",
    label,
    description,
    config,
    position,
  };
}

interface GeneratedEdge {
  source: string;
  target: string;
  label?: string;
}

async function generateWorkflowFromPrompt(prompt: string): Promise<{
  name: string;
  description: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}> {
  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 1500));

  const lowerPrompt = prompt.toLowerCase();

  // Pattern matching for different use cases
  if (lowerPrompt.includes("meeting") || lowerPrompt.includes("transcript")) {
    return generateMeetingWorkflow(prompt);
  }

  if (lowerPrompt.includes("customer") || lowerPrompt.includes("support") || lowerPrompt.includes("ticket")) {
    return generateSupportWorkflow(prompt);
  }

  if (lowerPrompt.includes("lead") || lowerPrompt.includes("sales") || lowerPrompt.includes("outreach")) {
    return generateSalesWorkflow(prompt);
  }

  if (lowerPrompt.includes("onboarding") || lowerPrompt.includes("employee") || lowerPrompt.includes("hr")) {
    return generateOnboardingWorkflow(prompt);
  }

  if (lowerPrompt.includes("invoice") || lowerPrompt.includes("payment") || lowerPrompt.includes("billing")) {
    return generateInvoiceWorkflow(prompt);
  }

  if (lowerPrompt.includes("incident") || lowerPrompt.includes("alert") || lowerPrompt.includes("pager")) {
    return generateIncidentWorkflow(prompt);
  }

  // Default generic workflow
  return generateGenericWorkflow(prompt);
}

function generateMeetingWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Meeting Recording Received",
      "Triggered when a new meeting recording is uploaded",
      { triggerMode: "webhook", webhookPath: "/meeting-upload" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Transcription Agent",
      "Transcribe meeting audio and extract raw text",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Transcribe and extract text", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Meeting Summarizer",
      "Generate structured meeting summary with key points",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Summarize meeting notes", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "ai-agent", "Task Extractor",
      "Extract action items and assign owners",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Extract action items", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "ai-agent", "Priority Classifier",
      "Classify tasks by priority and urgency",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Classify priority", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 650 }),
    catalogNode("node-6", "slack-send", "Send to Slack",
      "Post summary and tasks to Slack channel",
      { mode: "webhook", channel: "#meetings", message: "{{payload.summary}}" }, { x: 100, y: 800 }),
    catalogNode("node-7", "email-send", "Email Participants",
      "Send summary email to all meeting participants",
      { provider: "smtp", from: "noreply@company.com", to: "team@company.com", subject: "Meeting Summary", body: "{{payload.summary}}" },
      { x: 500, y: 800 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-5", target: "node-6" },
    { source: "node-5", target: "node-7" },
  ];

  return {
    name: "Meeting Intelligence Automation",
    description: "Automatically process meeting recordings, extract action items, and distribute summaries",
    nodes,
    edges,
  };
}

function generateSupportWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "New Ticket Received",
      "Triggered when new support ticket is created",
      { triggerMode: "webhook", webhookPath: "/support/ticket" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Ticket Classifier",
      "Classify ticket category and severity",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Classify support tickets", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Response Generator",
      "Generate initial response based on KB articles",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Draft professional support response", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "if-condition", "Escalation Check",
      "Decide if ticket needs human escalation",
      { leftPath: "payload.severity", operator: "equals", rightValue: "high" }, { x: 300, y: 500 }),
    catalogNode("node-5", "approval", "Manager Approval",
      "Require manager approval for high-severity tickets",
      { approvers: "manager@company.com", message: "Review escalated ticket", timeoutHours: 24 },
      { x: 100, y: 650 }),
    catalogNode("node-6", "slack-send", "Notify Support Team",
      "Send escalation alert to support channel",
      { mode: "webhook", channel: "#support-escalations", message: "{{payload.summary}}" },
      { x: 500, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5", label: "Needs escalation" },
    { source: "node-4", target: "node-6", label: "Auto-respond" },
  ];

  return {
    name: "Customer Support Automation",
    description: "Automatically classify, respond to, and escalate support tickets",
    nodes,
    edges,
  };
}

function generateSalesWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "New Lead Captured",
      "Triggered when a new lead is captured from form/API",
      { triggerMode: "webhook", webhookPath: "/leads/new" }, { x: 300, y: 50 }),
    catalogNode("node-2", "http-request", "Lead Data Enrichment",
      "Enrich lead data with company info and social profiles",
      { method: "GET", url: "https://api.clearbit.com/v1/enrichment" }, { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Lead Scoring",
      "Score lead quality based on firmographics and behavior",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Score lead quality", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "ai-agent", "Routing Decision",
      "Route to appropriate sales rep based on territory and score",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Route lead to rep", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "email-send", "Send Outreach Email",
      "Send personalized outreach email to lead",
      { provider: "smtp", from: "sales@company.com", to: "{{payload.email}}", subject: "Welcome!", body: "Hi {{payload.name}}" },
      { x: 100, y: 650 }),
    catalogNode("node-6", "slack-send", "Notify Sales Rep",
      "Alert assigned sales rep via Slack",
      { mode: "webhook", channel: "#sales-leads", message: "New lead: {{payload.name}}" },
      { x: 500, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-4", target: "node-6" },
  ];

  return {
    name: "Sales Lead Qualification & Outreach",
    description: "Automatically qualify, score, and route new sales leads with personalized outreach",
    nodes,
    edges,
  };
}

function generateOnboardingWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "New Hire Created in HRIS",
      "Triggered when HR creates new employee record",
      { triggerMode: "api" }, { x: 300, y: 50 }),
    catalogNode("node-2", "http-request", "Create IT Accounts",
      "Provision email, Slack, and tool access",
      { method: "POST", url: "https://api.internal.com/provision" }, { x: 300, y: 200 }),
    catalogNode("node-3", "email-send", "Welcome Email",
      "Send welcome email with onboarding guide",
      { provider: "smtp", from: "hr@company.com", to: "{{payload.email}}", subject: "Welcome!", body: "Welcome to the team!" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "slack-send", "Introduce in Slack",
      "Post introduction in team channel",
      { mode: "webhook", channel: "#team-intros", message: "Welcome {{payload.name}}!" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "approval", "Manager Checklist",
      "Manager confirms onboarding checklist completion",
      { approvers: "manager@company.com", message: "Confirm onboarding complete", timeoutHours: 72 },
      { x: 300, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
  ];

  return {
    name: "Employee Onboarding Workflow",
    description: "Automate new employee onboarding with IT provisioning and team introductions",
    nodes,
    edges,
  };
}

function generateInvoiceWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Invoice Uploaded",
      "Triggered when invoice document is uploaded",
      { triggerMode: "webhook", webhookPath: "/invoices/upload" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Invoice Data Extractor",
      "Extract vendor, amount, line items from invoice",
      { provider: "openai", model: "gpt-4o", systemPrompt: "Extract invoice data", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Data Validator",
      "Validate extracted data against PO and contracts",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Validate invoice data", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "if-condition", "Approval Routing",
      "Route to appropriate approver based on amount",
      { leftPath: "payload.amount", operator: "gt", rightValue: "1000" }, { x: 300, y: 500 }),
    catalogNode("node-5", "approval", "Approval Required",
      "Human approval for invoice payment",
      { approvers: "finance@company.com", message: "Approve invoice {{payload.invoiceId}}", timeoutHours: 48 },
      { x: 300, y: 650 }),
    catalogNode("node-6", "db-query", "Record Payment",
      "Record approved payment in accounting system",
      { dbType: "postgresql", connectionString: "{{secrets.DB_URL}}", operation: "insert", query: "INSERT INTO payments (invoice_id, amount) VALUES ($1, $2)", params: [] },
      { x: 300, y: 800 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
    { source: "node-5", target: "node-6" },
  ];

  return {
    name: "Invoice Processing & Approval",
    description: "Automate invoice processing with AI extraction, validation, and approval routing",
    nodes,
    edges,
  };
}

function generateIncidentWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Alert Received",
      "Triggered by monitoring system alert (PagerDuty, Datadog)",
      { triggerMode: "webhook", webhookPath: "/alerts/incoming" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Severity Classifier",
      "Classify incident severity and impact",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Classify incident severity", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Root Cause Analyzer",
      "Analyze logs and metrics to suggest root cause",
      { provider: "openai", model: "gpt-4o", systemPrompt: "Analyze root cause from logs", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "slack-send", "Create Incident Channel",
      "Create dedicated Slack channel for incident",
      { mode: "webhook", channel: "#incidents", message: "Incident: {{payload.title}}" },
      { x: 300, y: 500 }),
    catalogNode("node-5", "email-send", "Notify Stakeholders",
      "Send incident notification to stakeholders",
      { provider: "smtp", from: "alerts@company.com", to: "oncall@company.com", subject: "Incident: {{payload.title}}", body: "{{payload.summary}}" },
      { x: 300, y: 650 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
    { source: "node-4", target: "node-5" },
  ];

  return {
    name: "Incident Response Automation",
    description: "Automate incident classification, analysis, and stakeholder notification",
    nodes,
    edges,
  };
}

function generateGenericWorkflow(prompt: string) {
  const nodes: GeneratedNode[] = [
    catalogNode("node-1", "entry-point", "Incoming Request",
      "Webhook trigger for incoming data",
      { triggerMode: "webhook", webhookPath: "/incoming" }, { x: 300, y: 50 }),
    catalogNode("node-2", "ai-agent", "Data Processor",
      "Extract and process incoming data",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Process and extract data", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 200 }),
    catalogNode("node-3", "ai-agent", "Analysis Agent",
      "Analyze processed data and generate insights",
      { provider: "openai", model: "gpt-4o-mini", systemPrompt: "Analyze data and generate insights", userPromptTemplate: "{{payload.text}}" },
      { x: 300, y: 350 }),
    catalogNode("node-4", "slack-send", "Send Notification",
      "Send results via Slack",
      { mode: "webhook", channel: "#notifications", message: "{{payload.summary}}" },
      { x: 300, y: 500 }),
  ];

  const edges: GeneratedEdge[] = [
    { source: "node-1", target: "node-2" },
    { source: "node-2", target: "node-3" },
    { source: "node-3", target: "node-4" },
  ];

  return {
    name: "AI Workflow",
    description: `AI-generated workflow for: ${prompt}`,
    nodes,
    edges,
  };
}

export const generateRouter = router;
