# Workflow Templates

Pre-built workflow templates to get started quickly. Each template can be used as-is or customized.

---

## Quick Start

1. Go to the **Templates** tab in the dashboard
2. Browse or search for a template
3. Click **Use Template** to preview details
4. Click **Use This Template** to create a new workflow
5. Customize the node configs for your needs
6. Click **Run** to execute

---

## Template Overview

| # | Template | Category | Nodes | Difficulty | Best For |
|---|----------|----------|-------|------------|----------|
| 1 | [Customer Support](#1-customer-support-ticket-automation) | Customer Service | 6 | Beginner | Quickest demo, shows AI + approval |
| 2 | [Meeting Intelligence](#2-meeting-intelligence-automation) | Productivity | 7 | Beginner | AI extraction + multi-output |
| 3 | [Sales Lead Qualification](#3-sales-lead-qualification--outreach) | Sales | 6 | Beginner | Lead scoring + routing |
| 4 | [Invoice Processing](#4-invoice-processing--approval) | Finance | 6 | Intermediate | Data extraction + approval |
| 5 | [Employee Onboarding](#5-enterprise-employee-onboarding) | Enterprise | 10 | Advanced | Self-healing + multi-agent |

---

## Seeded Templates (in Database)

### 1. Customer Support Ticket Automation

**The easiest template to demo end-to-end.**

| | |
|---|---|
| **Category** | Customer Service |
| **Difficulty** | Beginner |
| **Nodes** | 6 |
| **Setup Time** | ~3 minutes |

**Flow:**
```
New Ticket          Ticket Classifier      Response Generator
(Webhook) -------> (AI Classification) --> (AI Drafting)
                                                |
                                                v
                                         Escalation Check
                                         (AI Decision)
                                           /        \
                                          v          v
                                   Manager        Notify Team
                                   Approval       (Slack)
                                   (Human Gate)
```

**What each node does:**

1. **New Ticket (Webhook Trigger)** -- Receives ticket data via HTTP POST
2. **Ticket Classifier (AI Agent)** -- Categorizes the ticket (billing, technical, feature request, complaint) and assesses sentiment/urgency
3. **Response Generator (AI Agent)** -- Drafts a professional response based on the classification
4. **Escalation Check (AI Decision Agent)** -- Decides whether to auto-respond or escalate to a human
5. **Manager Approval (Human Gate)** -- Manager reviews AI classification + drafted response, approves/rejects/modifies
6. **Notify Team (Slack)** -- Sends resolution summary to the team channel

**Sample input for testing:**
```json
{
  "customer_name": "Sarah Johnson",
  "customer_email": "sarah@acme.com",
  "subject": "Cannot access billing dashboard",
  "description": "I keep getting a 403 error trying to access billing. I need to download invoices for our quarterly review tomorrow.",
  "priority": "high"
}
```

**What to expect:** The AI classifies it as "Technical Issue / Urgent / Frustrated", drafts a helpful response, and escalates to manager approval because of the high urgency and frustrated sentiment.

---

### 2. Meeting Intelligence Automation

| | |
|---|---|
| **Category** | Productivity |
| **Difficulty** | Beginner |
| **Nodes** | 7 |
| **Setup Time** | ~5 minutes |

**Flow:**
```
Meeting Recording --> Transcription Agent --> Meeting Summarizer
                                                    |
                                                    v
                                             Task Extractor --> Priority Classifier
                                                                   /          \
                                                                  v            v
                                                           Send to Slack    Email
                                                                          Participants
```

**What each node does:**

1. **Meeting Recording (Webhook)** -- Receives meeting transcript/recording data
2. **Transcription Agent (AI)** -- Extracts text from the recording
3. **Meeting Summarizer (AI)** -- Creates a concise summary of key points
4. **Task Extractor (AI)** -- Identifies action items with owners and deadlines
5. **Priority Classifier (AI)** -- Ranks tasks by urgency and importance
6. **Send to Slack** -- Posts summary + action items to team channel
7. **Email Participants** -- Sends follow-up email with meeting notes

**Sample input:**
```json
{
  "meeting_title": "Q1 Planning Review",
  "transcript": "John: We need to finalize the budget by Friday. Sarah: I'll prepare the marketing spend breakdown. Mike: The engineering roadmap draft is ready for review. John: Let's schedule a follow-up for Wednesday to review everything.",
  "participants": ["john@company.com", "sarah@company.com", "mike@company.com"],
  "date": "2026-03-28"
}
```

---

### 3. Sales Lead Qualification & Outreach

| | |
|---|---|
| **Category** | Sales |
| **Difficulty** | Beginner |
| **Nodes** | 6 |
| **Setup Time** | ~5 minutes |

**Flow:**
```
New Lead --> Data Enrichment --> Lead Scoring --> Routing
                                                  /     \
                                                 v       v
                                          Outreach    Notify Rep
                                          Email       (Slack)
```

**What each node does:**

1. **New Lead (Webhook)** -- Receives lead data from a form or CRM
2. **Data Enrichment (AI)** -- Enriches lead with company info, social profiles
3. **Lead Scoring (AI)** -- Scores lead quality (0-100) based on fit and intent
4. **Routing (AI Decision)** -- Routes high-scoring leads to outreach, others to nurture
5. **Outreach Email** -- Sends personalized email to qualified leads
6. **Notify Rep (Slack)** -- Alerts the assigned sales rep

**Sample input:**
```json
{
  "name": "Alex Chen",
  "email": "alex@techstartup.io",
  "company": "TechStartup Inc",
  "title": "VP of Engineering",
  "source": "website_demo_request",
  "message": "Interested in automating our CI/CD pipeline notifications"
}
```

---

### 4. Invoice Processing & Approval

| | |
|---|---|
| **Category** | Finance |
| **Difficulty** | Intermediate |
| **Nodes** | 6 |
| **Setup Time** | ~5 minutes |

**Flow:**
```
File Upload --> Data Extraction --> Validation --> Approval Routing
                                                      |
                                                      v
                                                Manager Approval --> Payment Record
```

**What each node does:**

1. **File Upload (Webhook)** -- Receives invoice document data
2. **Data Extraction (AI)** -- Extracts vendor, amount, line items, dates
3. **Validation (AI)** -- Checks for anomalies, duplicate invoices, policy compliance
4. **Approval Routing (AI Decision)** -- Routes based on amount thresholds
5. **Manager Approval (Human Gate)** -- Manager reviews and approves
6. **Payment Record** -- Logs the approved payment

**Sample input:**
```json
{
  "vendor": "Cloud Services Inc",
  "invoice_number": "INV-2026-0342",
  "amount": 12500.00,
  "currency": "USD",
  "line_items": [
    { "description": "AWS hosting - March 2026", "amount": 8500.00 },
    { "description": "CDN bandwidth overage", "amount": 4000.00 }
  ],
  "due_date": "2026-04-15"
}
```

---

### 5. Enterprise Employee Onboarding

**The most comprehensive template -- showcases multi-agent collaboration and self-healing.**

| | |
|---|---|
| **Category** | Enterprise |
| **Difficulty** | Advanced |
| **Nodes** | 10 |
| **Setup Time** | ~8 minutes |

**Flow:**
```
New Hire Entry --> Data Validation Agent --> Background Verification
                                                  |
                                    +-------------+-------------+
                                    |                           |
                                    v                           v (on failure)
                          IT Provisioning Agent          Manual Review
                                    |                    (Fallback)
                                    |
                          +---------+---------+
                          |                   |
                          v                   v (on failure)
                  HR Compliance Agent    IT Helpdesk Escalation
                          |              (Fallback)
                          v
                  Manager Approval (Human Gate)
                          |
                          v
                  Notification Agent --> Onboarding Audit Agent
```

**What each node does:**

1. **New Hire Entry (Webhook)** -- Receives hire data (name, email, department, role, start date)
2. **Data Validation Agent (AI)** -- Validates completeness, checks duplicates, enriches missing fields, generates employee ID
3. **Background Verification Agent (AI)** -- Runs identity, employment history, education, and criminal record checks
4. **IT Provisioning Agent (AI)** -- Creates accounts based on department/role (email, Slack, GitHub, Jira, VPN)
5. **HR Compliance Agent (AI)** -- Verifies tax forms (W-4/W-9), NDAs, benefits enrollment, I-9 compliance
6. **Manager Approval (Human Gate)** -- Manager reviews all verification results and approves
7. **Notification Agent (AI)** -- Generates and sends welcome email, Slack intro, calendar invites
8. **Onboarding Audit Agent (AI)** -- Produces comprehensive timestamped audit trail
9. **Manual Review (Fallback)** -- Triggered if background check fails; HR security team reviews manually
10. **IT Helpdesk Escalation (Fallback)** -- Triggered if IT provisioning fails; escalation email to IT helpdesk

**Self-healing paths:**
- Background check failure --> Routes to Manual Review (approval node)
- IT provisioning failure --> Routes to IT Helpdesk Escalation (email)

**Sample input:**
```json
{
  "name": "Jordan Rivera",
  "email": "jordan.rivera@autochain.ai",
  "department": "Engineering",
  "role": "Senior Software Engineer",
  "startDate": "2026-04-15",
  "manager": "alex.chen@autochain.ai",
  "location": "San Francisco"
}
```

---

## YAML Template System

### Additional Templates (YAML-based)

Beyond the database-seeded templates above, AutoChain AI supports YAML-based templates stored in `/frontend/templates/`. These include:

- **Procurement to Payment** -- Purchase request to payment processing (9 nodes)
- **Contract Lifecycle** -- Contract creation to signature tracking (10 nodes)
- **Multi-Agent Collaboration** -- Complex task decomposition across specialist agents (10 nodes)
- **Workflow Health Monitor** -- Scheduled health checks and anomaly detection (10 nodes)
- **Incident Management** -- Alert to postmortem automation (10 nodes)
- **Sales Outreach** -- Lead qualification to personalized outreach (10 nodes)

### Importing & Exporting

**Import:** Click "Import YAML" in the template library, select a `.yaml` file.

**Export:** Click the download icon on any template card to get a `.yaml` file.

### YAML Format

```yaml
id: my-template
name: "My Template"
description: "What this template does"
category: "enterprise"          # enterprise, automation, ai, operations
icon: "Brain"                   # Any Lucide icon name
version: "1.0.0"
tags: [tag1, tag2]

preview:
  color: "#8b5cf6"
  estimatedTime: "5 min setup"
  difficulty: "beginner"        # beginner, intermediate, advanced
  useCases:
    - "Use case 1"
    - "Use case 2"

nodes:
  - id: "node-1"
    type: "entry-point"         # Any node type ID from Component Catalog
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

### Creating Your Own Template

1. Build a workflow in the visual editor
2. Test it with sample data
3. Export as YAML from the template library
4. Edit the YAML to add metadata (description, tags, difficulty)
5. Save to `/frontend/templates/` for sharing

---

## Which Template Should I Use?

| I want to... | Use this template |
|-------------|-------------------|
| Show a quick demo | Customer Support (6 nodes, simplest) |
| Demo AI extraction | Meeting Intelligence |
| Show lead routing | Sales Lead Qualification |
| Demo financial approval | Invoice Processing |
| Show self-healing + multi-agent | Employee Onboarding (most impressive) |
| Impress judges with complexity | Employee Onboarding + Customer Support together |
