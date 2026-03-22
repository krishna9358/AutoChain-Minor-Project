# Node Reference Guide

Every workflow is built from nodes. Each node performs one specific action. Connect them together to create powerful automations.

---

## Input Nodes

### Start Trigger (`entry-point`)
**The starting point of your workflow — choose how it gets kicked off.**

| Field | Description | Options |
|-------|-------------|---------|
| Trigger Mode | How the workflow starts | Manual, Webhook, Schedule (Cron), API Call |
| Webhook Path | URL path for incoming data | e.g. `/incoming/orders` |
| Cron Expression | Schedule timing | e.g. `0 */6 * * *` (every 6 hours) |
| Input Schema | Expected data format (JSON) | Optional |
| Test Input | Sample data for testing | Plain text |

### Form Input (`form-input`)
**Collects information from a person through a simple form before continuing.**

| Field | Description | Default |
|-------|-------------|---------|
| Form Title | Title shown at the top | Required |
| Instructions | Help text for the person | Optional |
| Form Fields | Field definitions (JSON) | Name + Email fields |
| Submit Button Text | Button label | "Submit" |
| Notify on Submit | Send notification when filled | No |
| Form Timeout | How long to wait (minutes) | 1440 (1 day) |

---

## Integration Nodes

### API Call (`http-request`)
**Connects to any external service or website to send or fetch data.**

| Field | Description | Default |
|-------|-------------|---------|
| HTTP Method | GET, POST, PUT, PATCH, DELETE | GET |
| Request URL | Full URL to call | Required |
| Authentication | None, Bearer Token, API Key, Basic Auth | None |
| Auth Token/Key | Credential (supports `{{secrets.KEY}}`) | — |
| Headers | Custom headers (JSON) | `{}` |
| Query Parameters | URL parameters (JSON) | `{}` |
| Request Body | Payload for POST/PUT (JSON) | `{}` |
| Timeout | Max wait time (ms) | 15000 |
| Retry Count | Retries on failure | 1 |

### Slack Message (`slack-send`)
**Sends a message to a Slack channel or person.**

| Field | Description | Default |
|-------|-------------|---------|
| Send Mode | Incoming Webhook or Bot API | Webhook |
| Webhook URL | Slack webhook URL | — |
| Channel | Channel name or user ID | Required |
| Message | Message text (supports `{{variable}}`) | Required |
| Bot Username | Display name | Optional |

### Send Email (`email-send`)
**Sends an email to one or more people with customizable content.**

| Field | Description | Default |
|-------|-------------|---------|
| Provider | SMTP, SendGrid, Mailgun, AWS SES | SMTP |
| API Key/Password | Service credential | — |
| From Address | Sender email | Required |
| To Address(es) | Comma-separated recipients | Required |
| Subject | Email subject (supports `{{variable}}`) | Required |
| Email Body | Content (supports `{{variable}}`) | Required |
| Send as HTML | Use HTML formatting | No |

### Database Query (`db-query`)
**Reads or writes data in your database.**

| Field | Description | Default |
|-------|-------------|---------|
| Database Type | PostgreSQL, MySQL, SQLite, MongoDB | PostgreSQL |
| Connection String | Database URL (use `{{secrets.DB_URL}}`) | Required |
| Operation | Raw Query, Insert, Update, Delete | Raw Query |
| SQL Query | Query with `$1, $2` placeholders | Required |
| Parameters | Array of parameter values | `[]` |

### GitHub (`github`)
**Works with GitHub — repos, issues, and pull requests.**

| Field | Description | Default |
|-------|-------------|---------|
| Access Token | GitHub PAT (use `{{secrets.GITHUB_TOKEN}}`) | Optional |
| Owner | Repo owner or organization | Required |
| Repository | Repo name | Required |
| Operation | Get repo, List issues/PRs, Create issue | Get repository |

### Google Calendar (`google-calendar`)
**Manages your Google Calendar — create, update, or view events.**

### Google Meet (`google-meet`)
**Creates Google Meet video calls automatically.**

### Google Docs (`google-docs`)
**Reads, creates, or updates Google Docs.**

### Google Sheets (`google-sheets`)
**Reads or updates Google Sheets — ideal for tracking data and dashboards.**

---

## AI Nodes

### AI Agent (`ai-agent`)
**Uses AI to think, analyze, write, or make decisions — the brain of your workflow.**

| Field | Description | Default |
|-------|-------------|---------|
| System Prompt | Instructions for the AI | Required |
| Model | AI model to use | From environment |
| Output Format | JSON or text | text |
| Temperature | Creativity level (0-1) | 0.7 |
| Max Tokens | Maximum response length | 4000 |
| Tools | Tools the AI can use | Optional |
| Memory | Enable conversation memory | No |
| Knowledge Base | Reference documents | Optional |

### Text Transform (`text-transform`)
**Formats, cleans, or transforms text — merge templates, find patterns, or reshape data.**

| Field | Description | Default |
|-------|-------------|---------|
| Operation | Template, Regex, Extract, Combine | Template |
| Template | Text with `{{variable}}` placeholders | — |
| Regex Pattern | Pattern to match | — |
| Replacement | Replacement text | — |

### Data Enrichment (`data-enrichment`)
**Pulls extra information from other systems to fill in missing details automatically.**

| Field | Description | Default |
|-------|-------------|---------|
| Enrichment Type | AI-powered, Database, API, Merge sources | AI-powered |
| Source Field | Field to use for lookup | Required |
| Fields to Add | New fields to look up (one per line) | — |
| AI Instructions | What to find (for AI mode) | — |
| API URL | External API (for API mode) | — |
| If Lookup Fails | Continue, Use defaults, or Stop | Continue |

---

## Logic Nodes

### If / Else (`if-condition`)
**Makes a yes/no decision and sends the workflow down different paths.**

| Field | Description | Default |
|-------|-------------|---------|
| Condition | JavaScript expression | Required |
| True Label | Label for the "yes" path | — |
| False Label | Label for the "no" path | — |

**Example conditions:**
- `payload.amount > 5000`
- `payload.status === "approved"`
- `payload.score >= 80`

### Switch / Router (`switch-case`)
**Routes the workflow to different paths — like a traffic controller for your data.**

| Field | Description | Default |
|-------|-------------|---------|
| Switch Field | Field to check | Required |
| Cases | Value-to-path mappings | Required |

### Loop / Iterator (`loop`)
**Repeats a set of steps for each item in a list.**

| Field | Description | Default |
|-------|-------------|---------|
| Array Field | Field containing the list | Required |
| Item Variable | Name for each item | `item` |
| Max Iterations | Safety limit | 100 |

---

## Control Nodes

### Delay / Wait (`delay`)
**Pauses the workflow for a set amount of time.**

| Field | Description | Default |
|-------|-------------|---------|
| Delay Type | Fixed duration or Until time | Fixed |
| Duration (ms) | How long to wait | 5000 |

### Error Handler (`error-handler`)
**Catches problems and recovers gracefully.**

| Field | Description | Default |
|-------|-------------|---------|
| Error Action | Retry, Fallback, Skip, Stop | Retry |
| Max Retries | Retry attempts | 3 |
| Retry Delay (ms) | Wait between retries | 1000 |
| Fallback Value | Default value if all else fails | — |

### Manual Approval (`approval`)
**Pauses the workflow and waits for a person to review and approve.**

| Field | Description | Default |
|-------|-------------|---------|
| Approvers | Email addresses | Required |
| Message | What to show the reviewer | Required |
| Timeout (min) | How long to wait | 4320 (3 days) |

### SLA Monitor (`sla-monitor`)
**Tracks deadlines and alerts your team before a Service Level Agreement is missed.**

| Field | Description | Default |
|-------|-------------|---------|
| SLA Name | Friendly identifier | Required |
| Deadline Type | Duration, Fixed date, or From previous step | Duration |
| Time Limit (min) | Minutes before breach | 60 |
| Warning At (%) | When to send warning | 80% |
| On Breach | Notify, Escalate, Reassign, or Pause | Notify |
| Notification Channel | Email, Slack, or Both | Email |
| Notify Who | Email or Slack channel | — |

### Task Assigner (`task-assigner`)
**Automatically assigns tasks to the right team members with clear deadlines.**

| Field | Description | Default |
|-------|-------------|---------|
| How to Assign | Specific person, Round-robin, Rules, AI | Specific |
| Assign To | Email/username (for specific) | — |
| Team Members | One per line (for round-robin) | — |
| Task Title | Title with `{{variable}}` support | Required |
| Task Details | Instructions for assignee | — |
| Priority | Low, Medium, High, Critical | Medium |
| Due In (min) | Minutes until due (1440 = 1 day) | 1440 |
| Send Notification | Notify the person | Yes |

### Escalation (`escalation`)
**Sends an alert to a manager when something needs attention.**

| Field | Description | Default |
|-------|-------------|---------|
| Reason | SLA breach, Error, Manual, Threshold, Approval | SLA breach |
| Escalate To | Email or Slack channel | Required |
| Severity | Low, Medium, High, Critical | Medium |
| Message | Escalation details (supports `{{variable}}`) | Required |
| Include Context | Attach workflow history | Yes |
| Wait for Response | Pause until acknowledged | No |

---

## Output Nodes

### Artifact Writer (`artifact-writer`)
**Saves the workflow output as a file you can download later.**

| Field | Description | Default |
|-------|-------------|---------|
| Artifact Name | File name | Required |
| Content | Data to store | Required |
| Format | JSON, Text, CSV | JSON |

### Webhook Response (`webhook-response`)
**Sends a response back to the system that triggered this workflow.**

| Field | Description | Default |
|-------|-------------|---------|
| Status Code | HTTP status code | 200 |
| Headers | Response headers (JSON) | Content-Type: application/json |
| Body Template | Response body (supports `{{variable}}`) | — |

### Audit Log (`audit-log`)
**Records every decision and action for compliance and easy review later.**

| Field | Description | Default |
|-------|-------------|---------|
| Detail Level | Basic (decisions only), Standard, Detailed (everything) | Standard |
| Category | General, Financial, Compliance, Security, Operational | General |
| Log Message | What to record (supports `{{variable}}`) | Required |
| Include Input Data | Save the step's input data | Yes |
| Keep For (days) | Retention period | 365 |

### Document Generator (`document-generator`)
**Creates reports, contracts, or summaries from your workflow data.**

| Field | Description | Default |
|-------|-------------|---------|
| Document Type | Report, Contract, Invoice, Summary, Letter, Custom | Report |
| Title | Document title (supports `{{variable}}`) | Required |
| Content Template | Body with `{{variable}}` placeholders | Required |
| Output Format | PDF, Word, Text, HTML, Markdown | PDF |
| Add Date/Time | Auto-add timestamp | Yes |
| Save as Artifact | Store for download | Yes |

---

## Using Variables

All text fields that say "supports `{{variable}}`" can reference data from previous steps:

- `{{payload.fieldName}}` — Data from the previous node's output
- `{{secrets.KEY_NAME}}` — Stored secrets (API keys, passwords)
- `{{payload.nested.field}}` — Nested data access

**Example:** `"Hello {{payload.customer_name}}, your order #{{payload.order_id}} is confirmed."`
