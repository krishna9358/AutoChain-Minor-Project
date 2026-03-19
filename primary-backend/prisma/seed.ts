import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AutoChain AI database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@autochain.ai" },
    update: {},
    create: {
      email: "demo@autochain.ai",
      name: "Demo User",
      password: "demo123",
      role: "ADMIN",
    },
  });

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo-workspace",
      description: "Default demo workspace for AutoChain AI",
      members: {
        create: {
          userId: user.id,
          role: "ADMIN",
        },
      },
    },
  });

  // Seed templates
  const templates = [
    {
      name: "Meeting Intelligence Automation",
      description: "Process meeting transcripts, extract action items, classify priority, and notify teams",
      category: "Productivity",
      icon: "🎤",
      tags: ["meeting", "transcription", "tasks", "slack"],
      nodesData: [
        { nodeType: "WEBHOOK_TRIGGER", category: "TRIGGER", label: "Meeting Recording", position: { x: 300, y: 50 } },
        { nodeType: "EXTRACTION_AGENT", category: "AI_AGENT", label: "Transcription Agent", position: { x: 300, y: 200 } },
        { nodeType: "SUMMARIZATION_AGENT", category: "AI_AGENT", label: "Meeting Summarizer", position: { x: 300, y: 350 } },
        { nodeType: "EXTRACTION_AGENT", category: "AI_AGENT", label: "Task Extractor", position: { x: 300, y: 500 } },
        { nodeType: "CLASSIFICATION_AGENT", category: "AI_AGENT", label: "Priority Classifier", position: { x: 300, y: 650 } },
        { nodeType: "SLACK_SEND", category: "ACTION", label: "Send to Slack", position: { x: 100, y: 800 } },
        { nodeType: "EMAIL_SEND", category: "ACTION", label: "Email Participants", position: { x: 500, y: 800 } },
      ],
      edgesData: [
        { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 },
        { source: 3, target: 4 }, { source: 4, target: 5 }, { source: 4, target: 6 },
      ],
    },
    {
      name: "Customer Support Ticket Automation",
      description: "Classify tickets, generate responses, and escalate when needed",
      category: "Customer Service",
      icon: "🎫",
      tags: ["support", "tickets", "classification", "auto-respond"],
      nodesData: [
        { nodeType: "WEBHOOK_TRIGGER", category: "TRIGGER", label: "New Ticket", position: { x: 300, y: 50 } },
        { nodeType: "CLASSIFICATION_AGENT", category: "AI_AGENT", label: "Ticket Classifier", position: { x: 300, y: 200 } },
        { nodeType: "REASONING_AGENT", category: "AI_AGENT", label: "Response Generator", position: { x: 300, y: 350 } },
        { nodeType: "DECISION_AGENT", category: "AI_AGENT", label: "Escalation Check", position: { x: 300, y: 500 } },
        { nodeType: "APPROVAL", category: "CONTROL", label: "Manager Approval", position: { x: 100, y: 650 } },
        { nodeType: "SLACK_SEND", category: "ACTION", label: "Notify Team", position: { x: 500, y: 650 } },
      ],
      edgesData: [
        { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 },
        { source: 3, target: 4 }, { source: 3, target: 5 },
      ],
    },
    {
      name: "Sales Lead Qualification & Outreach",
      description: "Enrich leads, score quality, route to reps, and send outreach",
      category: "Sales",
      icon: "🎯",
      tags: ["sales", "leads", "scoring", "outreach"],
      nodesData: [
        { nodeType: "WEBHOOK_TRIGGER", category: "TRIGGER", label: "New Lead", position: { x: 300, y: 50 } },
        { nodeType: "EXTRACTION_AGENT", category: "AI_AGENT", label: "Data Enrichment", position: { x: 300, y: 200 } },
        { nodeType: "CLASSIFICATION_AGENT", category: "AI_AGENT", label: "Lead Scoring", position: { x: 300, y: 350 } },
        { nodeType: "DECISION_AGENT", category: "AI_AGENT", label: "Routing", position: { x: 300, y: 500 } },
        { nodeType: "EMAIL_SEND", category: "ACTION", label: "Outreach Email", position: { x: 100, y: 650 } },
        { nodeType: "SLACK_SEND", category: "ACTION", label: "Notify Rep", position: { x: 500, y: 650 } },
      ],
      edgesData: [
        { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 },
        { source: 3, target: 4 }, { source: 3, target: 5 },
      ],
    },
    {
      name: "Invoice Processing & Approval",
      description: "Extract invoice data, validate, route for approval, process payment",
      category: "Finance",
      icon: "📄",
      tags: ["invoice", "finance", "approval", "payment"],
      nodesData: [
        { nodeType: "FILE_UPLOAD_TRIGGER", category: "TRIGGER", label: "Invoice Uploaded", position: { x: 300, y: 50 } },
        { nodeType: "EXTRACTION_AGENT", category: "AI_AGENT", label: "Data Extractor", position: { x: 300, y: 200 } },
        { nodeType: "VERIFICATION_AGENT", category: "AI_AGENT", label: "Validator", position: { x: 300, y: 350 } },
        { nodeType: "DECISION_AGENT", category: "AI_AGENT", label: "Approval Router", position: { x: 300, y: 500 } },
        { nodeType: "APPROVAL", category: "CONTROL", label: "Approval", position: { x: 300, y: 650 } },
        { nodeType: "DB_WRITE", category: "ACTION", label: "Record Payment", position: { x: 300, y: 800 } },
      ],
      edgesData: [
        { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 },
        { source: 3, target: 4 }, { source: 4, target: 5 },
      ],
    },
    {
      name: "Employee Onboarding",
      description: "Provision accounts, send welcome emails, introduce in Slack",
      category: "HR",
      icon: "👋",
      tags: ["hr", "onboarding", "provisioning"],
      nodesData: [
        { nodeType: "API_TRIGGER", category: "TRIGGER", label: "New Hire Created", position: { x: 300, y: 50 } },
        { nodeType: "API_CALL", category: "ACTION", label: "Create Accounts", position: { x: 300, y: 200 } },
        { nodeType: "EMAIL_SEND", category: "ACTION", label: "Welcome Email", position: { x: 300, y: 350 } },
        { nodeType: "SLACK_SEND", category: "ACTION", label: "Team Introduction", position: { x: 300, y: 500 } },
        { nodeType: "APPROVAL", category: "CONTROL", label: "Manager Checklist", position: { x: 300, y: 650 } },
      ],
      edgesData: [
        { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 }, { source: 3, target: 4 },
      ],
    },
    {
      name: "Incident Response Automation",
      description: "Classify severity, analyze root cause, create channels, notify stakeholders",
      category: "DevOps",
      icon: "🚨",
      tags: ["incident", "devops", "alerts", "response"],
      nodesData: [
        { nodeType: "WEBHOOK_TRIGGER", category: "TRIGGER", label: "Alert Received", position: { x: 300, y: 50 } },
        { nodeType: "CLASSIFICATION_AGENT", category: "AI_AGENT", label: "Severity Classifier", position: { x: 300, y: 200 } },
        { nodeType: "REASONING_AGENT", category: "AI_AGENT", label: "Root Cause Analyzer", position: { x: 300, y: 350 } },
        { nodeType: "SLACK_SEND", category: "ACTION", label: "Create Incident Channel", position: { x: 300, y: 500 } },
        { nodeType: "EMAIL_SEND", category: "ACTION", label: "Notify Stakeholders", position: { x: 300, y: 650 } },
      ],
      edgesData: [
        { source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 3 }, { source: 3, target: 4 },
      ],
    },
  ];

  for (const tmpl of templates) {
    await prisma.template.create({
      data: {
        workspaceId: workspace.id,
        name: tmpl.name,
        description: tmpl.description,
        category: tmpl.category,
        icon: tmpl.icon,
        tags: tmpl.tags,
        nodesData: tmpl.nodesData,
        edgesData: tmpl.edgesData,
        isPublic: true,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   User: demo@autochain.ai / demo123`);
  console.log(`   Workspace: ${workspace.name}`);
  console.log(`   Templates: ${templates.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });