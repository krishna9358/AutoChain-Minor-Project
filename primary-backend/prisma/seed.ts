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
      name: "Enterprise Employee Onboarding",
      description:
        "End-to-end multi-agent onboarding pipeline: validates new-hire data, runs background verification, provisions IT accounts, checks HR compliance, obtains manager approval, sends welcome notifications, and produces a full audit trail — with automatic fallback paths for failed checks.",
      category: "HR",
      icon: "🏢",
      tags: [
        "hr",
        "onboarding",
        "multi-agent",
        "compliance",
        "audit",
        "provisioning",
        "enterprise",
      ],
      nodesData: [
        // 0 — Entry Point
        {
          id: "entry-new-hire",
          nodeType: "entry-point",
          category: "input",
          label: "New Hire Entry",
          description:
            "Receives new-hire payload: name, email, department, role, startDate, manager.",
          config: {
            triggerMode: "webhook",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                department: { type: "string" },
                role: { type: "string" },
                startDate: { type: "string", format: "date" },
                manager: { type: "string" },
              },
              required: ["name", "email", "department", "role", "startDate", "manager"],
            },
          },
          position: { x: 400, y: 50 },
          metadata: { color: "#6366f1" },
        },
        // 1 — Data Validation Agent
        {
          id: "data-validation-agent",
          nodeType: "ai-agent",
          category: "ai",
          label: "Data Validation Agent",
          description:
            "Validates completeness of hire data, checks for duplicate records, and enriches missing fields such as employee ID or cost-center code.",
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            agentType: "extraction",
            systemPrompt:
              "You are an HR data-validation specialist. Given a new-hire record, perform the following checks:\n1. Verify all required fields are present and well-formed (valid email, future start date, etc.).\n2. Flag potential duplicate employees by name + email.\n3. If department or role is ambiguous, suggest the closest match from the company directory.\n4. Enrich the record with a generated employeeId (format: EMP-XXXX) and map the department to its cost-center code.\nReturn a JSON object with: { valid: boolean, errors: string[], enrichedRecord: {...} }.",
            userPromptTemplate:
              "Validate and enrich this new-hire record:\n\n{{JSON.stringify(payload)}}",
            temperature: 0.2,
          },
          position: { x: 400, y: 200 },
          metadata: { color: "#22c55e" },
        },
        // 2 — Background Verification Agent
        {
          id: "background-verification-agent",
          nodeType: "ai-agent",
          category: "ai",
          label: "Background Verification Agent",
          description:
            "Simulates a background check: verifies identity documents, employment history, and education credentials. Flags any discrepancies.",
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            agentType: "verification",
            systemPrompt:
              "You are a background-verification agent. Given the enriched employee record, simulate the following checks:\n1. Identity document verification — confirm name matches government ID.\n2. Employment history — verify last two employers and tenure.\n3. Education credentials — confirm highest degree and institution.\n4. Criminal record screen — flag if any issues found.\nReturn JSON: { passed: boolean, flags: string[], confidence: number (0-1), details: {...} }.\nIf any critical flag is raised, set passed = false.",
            userPromptTemplate:
              "Run background verification for:\n\n{{JSON.stringify(payload.enrichedRecord || payload)}}",
            temperature: 0.1,
          },
          position: { x: 400, y: 350 },
          metadata: { color: "#f59e0b" },
        },
        // 3 — IT Provisioning Agent
        {
          id: "it-provisioning-agent",
          nodeType: "ai-agent",
          category: "ai",
          label: "IT Provisioning Agent",
          description:
            "Determines and provisions IT accounts — email, Slack, GitHub, Jira, VPN — based on department and role. Applies least-privilege access policies.",
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            agentType: "reasoning",
            systemPrompt:
              "You are an IT provisioning agent. Based on the employee's department and role, decide which systems to provision:\n- All employees: corporate email, Slack, Jira.\n- Engineering: + GitHub org access, AWS console (read-only), VPN.\n- Design: + Figma, Adobe Creative Cloud.\n- Sales: + Salesforce, Gong.\n- Finance: + NetSuite, Expensify.\nFor each system, specify the access level (admin/write/read) following the principle of least privilege.\nReturn JSON: { accounts: [{ system, accessLevel, username }], provisioningStatus: 'success' | 'partial' | 'failed', issues: string[] }.",
            userPromptTemplate:
              "Provision IT accounts for this employee:\nDepartment: {{payload.enrichedRecord.department || payload.department}}\nRole: {{payload.enrichedRecord.role || payload.role}}\nName: {{payload.enrichedRecord.name || payload.name}}\nEmail: {{payload.enrichedRecord.email || payload.email}}",
            temperature: 0.3,
          },
          position: { x: 400, y: 500 },
          metadata: { color: "#3b82f6" },
        },
        // 4 — HR Compliance Agent
        {
          id: "hr-compliance-agent",
          nodeType: "ai-agent",
          category: "ai",
          label: "HR Compliance Agent",
          description:
            "Checks regulatory compliance: verifies tax form requirements (W-4/W-9), NDA status, benefits enrollment eligibility, and I-9 employment authorization.",
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            agentType: "compliance",
            systemPrompt:
              "You are an HR compliance agent. For the new employee, verify:\n1. Tax forms — determine if W-4 (employee) or W-9 (contractor) is required; check filing status.\n2. NDA / IP Agreement — confirm signed before start date.\n3. Benefits enrollment — verify eligibility window (30 days from start) and list available plans.\n4. I-9 Employment Authorization — confirm documentation is complete.\n5. State-specific requirements — check if the employee's work state has additional mandates.\nReturn JSON: { compliant: boolean, pendingItems: [{ item, deadline, status }], riskLevel: 'low' | 'medium' | 'high' }.",
            userPromptTemplate:
              "Check HR compliance for:\n\n{{JSON.stringify(payload.enrichedRecord || payload)}}",
            temperature: 0.1,
          },
          position: { x: 400, y: 650 },
          metadata: { color: "#ef4444" },
        },
        // 5 — Manager Approval
        {
          id: "manager-approval",
          nodeType: "approval",
          category: "control",
          label: "Manager Approval",
          description:
            "Human-in-the-loop gate: the hiring manager reviews the complete onboarding package — verified data, background check results, provisioned accounts, and compliance status — then approves or requests changes.",
          config: {
            approvers: "{{payload.manager}}",
            message:
              "Please review the onboarding package for {{payload.name}} ({{payload.role}}, {{payload.department}}).\n\nBackground Check: {{payload.backgroundCheck.passed ? 'PASSED' : 'FLAGGED'}}\nIT Accounts: {{payload.itProvisioning.provisioningStatus}}\nCompliance: {{payload.compliance.compliant ? 'COMPLIANT' : 'ACTION REQUIRED'}}\n\nApprove to proceed with Day-1 notifications.",
            timeoutHours: 48,
            timeoutAction: "reject",
          },
          position: { x: 400, y: 800 },
          metadata: { color: "#8b5cf6" },
        },
        // 6 — Notification Agent
        {
          id: "notification-agent",
          nodeType: "ai-agent",
          category: "ai",
          label: "Notification Agent",
          description:
            "Generates and dispatches personalized welcome communications: welcome email with first-day instructions, Slack team introduction, and calendar invites for orientation sessions.",
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            agentType: "decision",
            systemPrompt:
              "You are a friendly onboarding communications agent. Based on the approved onboarding package, generate:\n1. Welcome Email — personalized with the employee's name, role, start date, manager name, and first-day logistics (building/floor, parking, dress code).\n2. Slack Introduction — a brief, warm message to post in the team channel introducing the new hire.\n3. Calendar Invites — list of orientation sessions to schedule (IT setup, HR benefits overview, team meet-and-greet, 30-day check-in with manager).\nReturn JSON: { welcomeEmail: { subject, body }, slackMessage: string, calendarInvites: [{ title, date, duration, attendees }] }.",
            userPromptTemplate:
              "Generate onboarding notifications for:\nName: {{payload.name}}\nRole: {{payload.role}}\nDepartment: {{payload.department}}\nStart Date: {{payload.startDate}}\nManager: {{payload.manager}}",
            temperature: 0.7,
          },
          position: { x: 400, y: 950 },
          metadata: { color: "#06b6d4" },
        },
        // 7 — Onboarding Audit Agent
        {
          id: "onboarding-audit-agent",
          nodeType: "ai-agent",
          category: "ai",
          label: "Onboarding Audit Agent",
          description:
            "Creates a comprehensive, timestamped audit trail summarizing every decision made by prior agents — validation results, background check outcome, provisioned accounts, compliance status, and manager approval — for regulatory record-keeping.",
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            agentType: "extraction",
            systemPrompt:
              "You are an onboarding audit agent responsible for creating a complete, tamper-evident audit trail. Compile a structured report covering:\n1. Data Validation — what was checked, enriched fields, any corrections.\n2. Background Verification — checks performed, pass/fail, confidence score, any flags.\n3. IT Provisioning — accounts created, access levels, any failures.\n4. HR Compliance — pending items, risk level, deadlines.\n5. Manager Approval — who approved, timestamp, any comments.\n6. Notifications — what was sent, to whom.\nReturn JSON: { auditId, employeeId, employeeName, timestamp, stages: [{ stage, status, summary, details }], overallStatus: 'complete' | 'partial' | 'failed' }.",
            userPromptTemplate:
              "Generate audit trail for the onboarding of {{payload.name}} ({{payload.enrichedRecord.employeeId || 'N/A'}}).\n\nFull pipeline data:\n{{JSON.stringify(payload)}}",
            temperature: 0.1,
          },
          position: { x: 400, y: 1100 },
          metadata: { color: "#64748b" },
        },
        // 8 — Manual Review (fallback for background check failure)
        {
          id: "manual-review-fallback",
          nodeType: "approval",
          category: "control",
          label: "Manual Review",
          description:
            "Fallback path: if the Background Verification Agent flags issues, the case is routed here for manual human review by the HR security team before proceeding.",
          config: {
            approvers: "hr-security@company.com",
            message:
              "ATTENTION: Background check flagged issues for {{payload.name}}.\n\nFlags: {{JSON.stringify(payload.backgroundCheck.flags)}}\nConfidence: {{payload.backgroundCheck.confidence}}\n\nPlease review manually and approve to continue onboarding, or reject to terminate the process.",
            timeoutHours: 72,
            timeoutAction: "reject",
          },
          position: { x: 750, y: 350 },
          metadata: { color: "#dc2626" },
        },
        // 9 — IT Helpdesk Escalation (fallback for IT provisioning failure)
        {
          id: "it-helpdesk-escalation",
          nodeType: "email-send",
          category: "integration",
          label: "IT Helpdesk Escalation",
          description:
            "Fallback path: if the IT Provisioning Agent fails or partially provisions accounts, an escalation email is sent to the IT helpdesk with full details for manual resolution.",
          config: {
            provider: "smtp",
            to: "it-helpdesk@company.com",
            subject:
              "ESCALATION: IT Provisioning Failed for {{payload.name}} ({{payload.enrichedRecord.employeeId || 'N/A'}})",
            body: "The automated IT provisioning for {{payload.name}} ({{payload.role}}, {{payload.department}}) encountered issues.\n\nProvisioning Status: {{payload.itProvisioning.provisioningStatus}}\nIssues:\n{{JSON.stringify(payload.itProvisioning.issues)}}\n\nAccounts attempted:\n{{JSON.stringify(payload.itProvisioning.accounts)}}\n\nPlease complete provisioning manually and update the onboarding ticket.",
          },
          position: { x: 750, y: 500 },
          metadata: { color: "#f97316" },
        },
      ],
      edgesData: [
        // Main sequential flow
        { source: 0, target: 1, label: "Start" },
        { source: 1, target: 2, label: "Validated" },
        { source: 2, target: 3, label: "Verified" },
        { source: 3, target: 4, label: "Provisioned" },
        { source: 4, target: 5, label: "Compliant" },
        { source: 5, target: 6, label: "Approved" },
        { source: 6, target: 7, label: "Notified" },
        // Fallback: Background Verification fails → Manual Review
        {
          source: 2,
          target: 8,
          label: "Verification Failed",
          condition: { type: "fallback" },
        },
        // Manual Review approved → rejoin main flow at IT Provisioning
        { source: 8, target: 3, label: "Manually Approved" },
        // Fallback: IT Provisioning fails → IT Helpdesk Escalation
        {
          source: 3,
          target: 9,
          label: "Provisioning Failed",
          condition: { type: "fallback" },
        },
        // IT Helpdesk escalation → rejoin main flow at HR Compliance
        { source: 9, target: 4, label: "Helpdesk Resolved" },
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