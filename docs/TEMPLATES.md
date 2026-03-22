# Workflow Templates

Pre-built workflow templates to get you started quickly. Each template can be used as-is or customized to fit your needs.

---

## Enterprise Templates

### 1. Procurement to Payment
**Automates the entire purchasing process — from request to payment.**

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Setup Time** | ~10 minutes |
| **Nodes** | 9 |
| **Category** | Enterprise |

**Workflow Flow:**
1. **Purchase Request Form** — Collects item name, quantity, cost, vendor, and justification
2. **AI Validate & Categorize** — Reviews the request for completeness, categorizes it
3. **Budget Check** — Routes purchases over $5,000 for manager approval
4. **Manager Approval** — Manager reviews and approves/rejects
5. **AI Generate Purchase Order** — Creates a formal PO with all details
6. **Create PO Document** — Generates the official PDF
7. **Assign to Procurement** — Round-robin assigns to the procurement team
8. **Track Delivery** — SLA monitor watches the delivery deadline
9. **Record Decision Trail** — Full audit log for compliance

**Use Cases:** Purchase orders, vendor payments, budget approvals, expense management

---

### 2. Employee Onboarding
**Streamlines new hire onboarding from day one.**

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Setup Time** | ~8 minutes |
| **Nodes** | 9 |
| **Category** | Enterprise |

**Workflow Flow:**
1. **New Hire Details** — HR fills in employee information
2. **AI Onboarding Plan** — Generates a 30-day personalized plan
3. **IT Setup Tasks** — Assigns account/equipment setup to IT (round-robin)
4. **HR Paperwork** — Assigns compliance tasks to HR
5. **Gather Team Info** — Looks up department team members and resources
6. **Welcome Packet** — Generates a personalized welcome PDF
7. **Welcome Email** — Sends onboarding details to the new hire
8. **30-Day Check-in** — SLA monitor reminds the manager
9. **Log Onboarding** — Records everything for HR

**Use Cases:** New hire onboarding, IT provisioning, HR task coordination

---

### 3. Contract Lifecycle
**Manages contracts from creation to signature.**

| | |
|---|---|
| **Difficulty** | Advanced |
| **Setup Time** | ~10 minutes |
| **Nodes** | 10 |
| **Category** | Enterprise |

**Workflow Flow:**
1. **Contract Request** — Triggered via webhook
2. **Contract Details** — Collects type, parties, value, terms via form
3. **AI Draft Contract** — Generates a professional contract
4. **Create Contract PDF** — Produces the formal document
5. **Legal Review** — Legal team approves or rejects
6. **Approval Check** — Routes based on decision
7. **Send for Signature** — Emails the contract to the other party
8. **Signature Deadline** — SLA tracks the 7-day signing window
9. **Overdue Alert** — Escalates to legal head if overdue
10. **Record All Decisions** — Compliance audit trail

**Use Cases:** Vendor agreements, NDAs, employment contracts, SLAs

---

### 4. Meeting Intelligence
**Turns meeting recordings into action items.**

| | |
|---|---|
| **Difficulty** | Beginner |
| **Setup Time** | ~5 minutes |
| **Nodes** | 8 |
| **Category** | AI-Powered |

**Workflow Flow:**
1. **Meeting Transcript** — Receives transcript via webhook
2. **Extract Key Decisions** — AI identifies all decisions made
3. **Identify Action Items** — AI finds tasks and suggests owners
4. **Assign Action Items** — Creates and assigns tasks to people
5. **Share Summary** — Posts meeting summary to Slack
6. **Track Completion** — SLA monitors task deadlines
7. **Follow Up on Stalls** — Escalates overdue tasks
8. **Log Meeting Record** — Saves for future reference

**Use Cases:** Team meetings, standup follow-ups, decision tracking

---

### 5. Multi-Agent Collaboration
**Multiple AI agents work together on complex tasks.**

| | |
|---|---|
| **Difficulty** | Advanced |
| **Setup Time** | ~8 minutes |
| **Nodes** | 10 |
| **Category** | AI-Powered |

**Workflow Flow:**
1. **Task Input** — Receives the complex task
2. **Task Planner** — AI breaks it into sub-tasks
3. **Route by Complexity** — Sends to specialist agents
4. **Data Retrieval Agent** — Gathers data from multiple sources
5. **Analysis Agent** — Identifies patterns and insights
6. **Decision Agent** — Makes recommendations with confidence levels
7. **Human Verification** — Person reviews AI recommendations
8. **Execution Agent** — Compiles final deliverable
9. **Final Report** — Generates polished PDF report
10. **Decision Trail** — Records every agent decision

**Use Cases:** Research projects, competitive analysis, multi-step data analysis

---

### 6. Workflow Health Monitor
**Proactively monitors your workflows for problems.**

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Setup Time** | ~7 minutes |
| **Nodes** | 10 |
| **Category** | Operations |

**Workflow Flow:**
1. **Scheduled Check** — Runs every 2 hours automatically
2. **Fetch Metrics** — Pulls workflow execution data
3. **Analyze Health** — AI spots anomalies and trends
4. **Issues Found?** — Routes based on health status
5. **Gather Context** — Gets details on flagged workflows
6. **Predict Bottlenecks** — AI forecasts future problems
7. **Check SLA Compliance** — Verifies all SLAs are on track
8. **Critical Alert** — Escalates urgent issues
9. **Health Report** — Posts summary to Slack
10. **Log Results** — Records for trending analysis

**Use Cases:** Workflow monitoring, SLA tracking, bottleneck detection

---

## Automation Templates

### 7. Customer Support
**AI-powered ticket handling with SLA tracking.**

| | |
|---|---|
| **Difficulty** | Beginner |
| **Setup Time** | ~6 minutes |
| **Nodes** | 9 |

**Flow:** New ticket → AI classifies → Route by category → Fetch customer history → AI drafts response → Agent reviews → Send reply → Track resolution SLA → Log activity

---

### 8. Incident Management
**End-to-end incident response automation.**

| | |
|---|---|
| **Difficulty** | Intermediate |
| **Setup Time** | ~8 minutes |
| **Nodes** | 10 |

**Flow:** Alert received → AI analyzes severity → Route by severity → Escalate critical → Assign responder → Notify Slack → Track resolution SLA → AI generates postmortem → Create report PDF → Log incident

---

### 9. Sales Outreach
**Automated lead qualification and personalized outreach.**

| | |
|---|---|
| **Difficulty** | Beginner |
| **Setup Time** | ~6 minutes |
| **Nodes** | 10 |

**Flow:** New lead → Enrich company data → AI scores quality → Check qualification → AI personalizes email → Rep reviews → Send email → Wait for response → AI analyzes reply → Log activity

---

## Working with Templates

### Using a Template
1. Go to the **Templates** tab in the dashboard
2. Browse or search for a template
3. Click **Use Template** to preview details
4. Click **Use This Template** to create a new workflow
5. Customize the node configs for your specific needs

### Importing a Template
1. Click the **Import YAML** button in the template library
2. Select a `.yaml` file from your computer
3. The template appears in your library immediately

### Exporting a Template
1. Find the template you want to share
2. Click the **download icon** on the template card
3. A `.yaml` file downloads to your computer

### Template YAML Format
Templates are stored as YAML files with this structure:

```yaml
id: my-template
name: "My Template"
description: "What this template does"
category: "enterprise"     # enterprise, automation, ai, operations
icon: "Brain"              # Any Lucide icon name
version: "1.0.0"
tags: [tag1, tag2]

preview:
  color: "#8b5cf6"
  estimatedTime: "5 min setup"
  difficulty: "beginner"   # beginner, intermediate, advanced
  useCases:
    - "Use case 1"
    - "Use case 2"

nodes:
  - id: "node-1"
    type: "entry-point"    # Any node type ID
    name: "Step Name"
    description: "What this step does"
    position: { x: 100, y: 200 }
    config:
      triggerMode: "webhook"

edges:
  - id: "e-1"
    source: "node-1"
    target: "node-2"
    label: "Optional label"
```

### Template Directory
All templates are stored in `/frontend/templates/` as individual YAML files. To add a new template, create a `.yaml` file in that directory following the format above.
