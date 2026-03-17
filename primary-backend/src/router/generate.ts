import { Router } from "express";
import prisma from "../db";
import { authMiddleware, AuthRequest } from "../middleware";

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
  nodeType: string;
  category: string;
  label: string;
  description: string;
  config: any;
  position: { x: number; y: number };
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
    {
      tempId: "node-1",
      nodeType: "WEBHOOK_TRIGGER",
      category: "TRIGGER",
      label: "Meeting Recording Received",
      description: "Triggered when a new meeting recording is uploaded",
      config: { webhookPath: "/meeting-upload" },
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "EXTRACTION_AGENT",
      category: "AI_AGENT",
      label: "Transcription Agent",
      description: "Transcribe meeting audio and extract raw text",
      config: { model: "whisper-large" },
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "SUMMARIZATION_AGENT",
      category: "AI_AGENT",
      label: "Meeting Summarizer",
      description: "Generate structured meeting summary with key points",
      config: { format: "structured" },
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "EXTRACTION_AGENT",
      category: "AI_AGENT",
      label: "Task Extractor",
      description: "Extract action items and assign owners",
      config: { extractType: "action_items" },
      position: { x: 300, y: 500 },
    },
    {
      tempId: "node-5",
      nodeType: "CLASSIFICATION_AGENT",
      category: "AI_AGENT",
      label: "Priority Classifier",
      description: "Classify tasks by priority and urgency",
      config: { labels: ["high", "medium", "low"] },
      position: { x: 300, y: 650 },
    },
    {
      tempId: "node-6",
      nodeType: "SLACK_SEND",
      category: "ACTION",
      label: "Send to Slack",
      description: "Post summary and tasks to Slack channel",
      config: { channel: "#meetings" },
      position: { x: 100, y: 800 },
    },
    {
      tempId: "node-7",
      nodeType: "EMAIL_SEND",
      category: "ACTION",
      label: "Email Participants",
      description: "Send summary email to all meeting participants",
      config: { template: "meeting_summary" },
      position: { x: 500, y: 800 },
    },
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
    {
      tempId: "node-1",
      nodeType: "WEBHOOK_TRIGGER",
      category: "TRIGGER",
      label: "New Ticket Received",
      description: "Triggered when new support ticket is created",
      config: { source: "zendesk" },
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "CLASSIFICATION_AGENT",
      category: "AI_AGENT",
      label: "Ticket Classifier",
      description: "Classify ticket category and severity",
      config: { categories: ["billing", "technical", "feature_request", "bug"] },
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "REASONING_AGENT",
      category: "AI_AGENT",
      label: "Response Generator",
      description: "Generate initial response based on KB articles",
      config: { tone: "professional", useKB: true },
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "DECISION_AGENT",
      category: "AI_AGENT",
      label: "Escalation Check",
      description: "Decide if ticket needs human escalation",
      config: { threshold: 0.8 },
      position: { x: 300, y: 500 },
    },
    {
      tempId: "node-5",
      nodeType: "APPROVAL",
      category: "CONTROL",
      label: "Manager Approval",
      description: "Require manager approval for high-severity tickets",
      config: { approver: "manager" },
      position: { x: 100, y: 650 },
    },
    {
      tempId: "node-6",
      nodeType: "SLACK_SEND",
      category: "ACTION",
      label: "Notify Support Team",
      description: "Send escalation alert to support channel",
      config: { channel: "#support-escalations" },
      position: { x: 500, y: 650 },
    },
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
    {
      tempId: "node-1",
      nodeType: "WEBHOOK_TRIGGER",
      category: "TRIGGER",
      label: "New Lead Captured",
      description: "Triggered when a new lead is captured from form/API",
      config: { source: "landing_page" },
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "EXTRACTION_AGENT",
      category: "AI_AGENT",
      label: "Lead Data Enrichment",
      description: "Enrich lead data with company info and social profiles",
      config: { enrichSources: ["clearbit", "linkedin"] },
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "CLASSIFICATION_AGENT",
      category: "AI_AGENT",
      label: "Lead Scoring",
      description: "Score lead quality based on firmographics and behavior",
      config: { model: "lead_scoring_v2" },
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "DECISION_AGENT",
      category: "AI_AGENT",
      label: "Routing Decision",
      description: "Route to appropriate sales rep based on territory and score",
      config: { routingRules: "territory_based" },
      position: { x: 300, y: 500 },
    },
    {
      tempId: "node-5",
      nodeType: "EMAIL_SEND",
      category: "ACTION",
      label: "Send Outreach Email",
      description: "Send personalized outreach email to lead",
      config: { template: "sales_outreach" },
      position: { x: 100, y: 650 },
    },
    {
      tempId: "node-6",
      nodeType: "SLACK_SEND",
      category: "ACTION",
      label: "Notify Sales Rep",
      description: "Alert assigned sales rep via Slack",
      config: { channel: "#sales-leads" },
      position: { x: 500, y: 650 },
    },
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
    {
      tempId: "node-1",
      nodeType: "API_TRIGGER",
      category: "TRIGGER",
      label: "New Hire Created in HRIS",
      description: "Triggered when HR creates new employee record",
      config: { source: "workday" },
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "API_CALL",
      category: "ACTION",
      label: "Create IT Accounts",
      description: "Provision email, Slack, and tool access",
      config: { services: ["google_workspace", "slack", "github"] },
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "EMAIL_SEND",
      category: "ACTION",
      label: "Welcome Email",
      description: "Send welcome email with onboarding guide",
      config: { template: "welcome_new_hire" },
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "SLACK_SEND",
      category: "ACTION",
      label: "Introduce in Slack",
      description: "Post introduction in team channel",
      config: { channel: "#team-intros" },
      position: { x: 300, y: 500 },
    },
    {
      tempId: "node-5",
      nodeType: "APPROVAL",
      category: "CONTROL",
      label: "Manager Checklist",
      description: "Manager confirms onboarding checklist completion",
      config: { approver: "hiring_manager" },
      position: { x: 300, y: 650 },
    },
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
    {
      tempId: "node-1",
      nodeType: "FILE_UPLOAD_TRIGGER",
      category: "TRIGGER",
      label: "Invoice Uploaded",
      description: "Triggered when invoice document is uploaded",
      config: { formats: ["pdf", "jpg", "png"] },
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "EXTRACTION_AGENT",
      category: "AI_AGENT",
      label: "Invoice Data Extractor",
      description: "Extract vendor, amount, line items from invoice",
      config: { model: "document_ai" },
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "VERIFICATION_AGENT",
      category: "AI_AGENT",
      label: "Data Validator",
      description: "Validate extracted data against PO and contracts",
      config: { checkPO: true, checkContract: true },
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "DECISION_AGENT",
      category: "AI_AGENT",
      label: "Approval Routing",
      description: "Route to appropriate approver based on amount",
      config: { thresholds: { manager: 1000, director: 10000, vp: 50000 } },
      position: { x: 300, y: 500 },
    },
    {
      tempId: "node-5",
      nodeType: "APPROVAL",
      category: "CONTROL",
      label: "Approval Required",
      description: "Human approval for invoice payment",
      config: {},
      position: { x: 300, y: 650 },
    },
    {
      tempId: "node-6",
      nodeType: "DB_WRITE",
      category: "ACTION",
      label: "Record Payment",
      description: "Record approved payment in accounting system",
      config: { table: "payments" },
      position: { x: 300, y: 800 },
    },
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
    {
      tempId: "node-1",
      nodeType: "WEBHOOK_TRIGGER",
      category: "TRIGGER",
      label: "Alert Received",
      description: "Triggered by monitoring system alert (PagerDuty, Datadog)",
      config: { source: "pagerduty" },
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "CLASSIFICATION_AGENT",
      category: "AI_AGENT",
      label: "Severity Classifier",
      description: "Classify incident severity and impact",
      config: { levels: ["P1", "P2", "P3", "P4"] },
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "REASONING_AGENT",
      category: "AI_AGENT",
      label: "Root Cause Analyzer",
      description: "Analyze logs and metrics to suggest root cause",
      config: { dataSources: ["logs", "metrics", "traces"] },
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "SLACK_SEND",
      category: "ACTION",
      label: "Create Incident Channel",
      description: "Create dedicated Slack channel for incident",
      config: { createChannel: true, prefix: "inc-" },
      position: { x: 300, y: 500 },
    },
    {
      tempId: "node-5",
      nodeType: "EMAIL_SEND",
      category: "ACTION",
      label: "Notify Stakeholders",
      description: "Send incident notification to stakeholders",
      config: { template: "incident_notification" },
      position: { x: 300, y: 650 },
    },
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
    {
      tempId: "node-1",
      nodeType: "WEBHOOK_TRIGGER",
      category: "TRIGGER",
      label: "Incoming Request",
      description: "Webhook trigger for incoming data",
      config: {},
      position: { x: 300, y: 50 },
    },
    {
      tempId: "node-2",
      nodeType: "EXTRACTION_AGENT",
      category: "AI_AGENT",
      label: "Data Processor",
      description: "Extract and process incoming data",
      config: {},
      position: { x: 300, y: 200 },
    },
    {
      tempId: "node-3",
      nodeType: "REASONING_AGENT",
      category: "AI_AGENT",
      label: "Analysis Agent",
      description: "Analyze processed data and generate insights",
      config: {},
      position: { x: 300, y: 350 },
    },
    {
      tempId: "node-4",
      nodeType: "SLACK_SEND",
      category: "ACTION",
      label: "Send Notification",
      description: "Send results via Slack",
      config: { channel: "#notifications" },
      position: { x: 300, y: 500 },
    },
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
