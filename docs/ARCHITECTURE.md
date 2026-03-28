# Architecture Overview

AutoChain AI is an enterprise workflow automation platform that lets you build, run, and monitor multi-step business processes using a visual drag-and-drop interface powered by AI agents.

---

## System Architecture

```
                    +----------------------------+
                    |         Frontend           |
                    |   Next.js 14 + React Flow  |
                    |   (Visual Workflow Editor)  |
                    |        Port 3000           |
                    +-----------+----------------+
                                |
                       REST API + WebSocket
                                |
                    +-----------v----------------+
                    |      Primary Backend       |
                    |   Express.js + TypeScript  |
                    | (API, Auth, Execution Engine)|
                    |        Port 3001           |
                    +-----------+----------------+
                                |
                    +-----------v----------------+
                    |      PostgreSQL 16         |
                    |  (Workflows, Runs, Audit)  |
                    |        Port 5432           |
                    +-----------+----------------+
                                |
                    +-----------v----------------+
                    |      AI Provider (LLM)     |
                    |  Groq / OpenAI / OpenRouter |
                    |  / Ollama (local)          |
                    +----------------------------+
```

## Services (3 Docker Containers)

| Service | Port | Technology | Responsibility |
|---------|------|-----------|---------------|
| **Frontend** | 3000 | Next.js 14 | Visual workflow editor, dashboards, real-time execution UI |
| **Backend** | 3001 | Express.js | REST API, execution engine, auth, integrations, WebSocket server |
| **PostgreSQL** | 5432 | PostgreSQL 16 | Persistent storage (workflows, runs, users, secrets, audit logs) |

---

## Key Components

### Frontend

- **Framework:** Next.js 14 with App Router and TypeScript
- **Canvas:** @xyflow/react (React Flow) for the visual workflow editor
- **State Management:** Zustand with Zundo (undo/redo support)
- **Styling:** Tailwind CSS + shadcn/ui components + Framer Motion animations
- **Real-time:** WebSocket connection (`useExecutionStream` hook) for live execution updates -- nodes light up as each step runs
- **AI Integration:** Vercel AI SDK for the AI workflow generation UI

### Primary Backend

- **Framework:** Express.js with TypeScript
- **ORM:** Prisma 5.17 with PostgreSQL
- **Authentication:** JWT tokens with bcrypt password hashing
- **AI:** Vercel AI SDK with `@ai-sdk/openai` (supports any OpenAI-compatible API)
- **Encryption:** AES-256 for secrets and credentials at rest
- **Validation:** Zod schemas for all node configurations via Component Catalog
- **Real-time:** WebSocket server at `/ws` that broadcasts execution progress (`step_started`, `step_completed`, `step_failed`, `run_completed`, `run_failed`)

---

## Data Flow

### Building a Workflow

```
User drags nodes     Zustand store     Save to Backend     Backend validates
onto React Flow  --> manages state --> (PUT /workflows) --> against Component
canvas               (with undo/redo)                       Catalog schemas
```

### Executing a Workflow

```
POST /execution/run/:workflowId  (with triggerData JSON body)
        |
        v
Backend loads workflow (nodes + edges) from PostgreSQL
        |
        v
Resolves {{secrets.KEY}} references from encrypted secret store
        |
        v
Validates all node configs against required fields
        |
        v
Creates WorkflowRun record (status: RUNNING)
Creates RunStep records for each node (status: PENDING)
        |
        v
Execution engine starts BFS traversal from trigger node:

  For each node in order:
    1. Broadcast "step_started" via WebSocket
    2. Compute step input (trigger payload or upstream node output)
    3. Select executor:
       - AI Agent nodes   --> NodeExecutorFactory --> calls LLM via Vercel AI SDK
       - GitHub nodes     --> executeGithubNode (GitHub API)
       - Google nodes     --> executeGoogleCloudNode (Calendar/Docs/Sheets/Meet)
       - Other nodes      --> NodeExecutorFactory or simulated output
    4. Store result in RunStep (input + output payloads)
    5. Broadcast "step_completed" via WebSocket
    6. Queue child nodes for next execution
        |
        v
On APPROVAL node:
  - Creates Approval record (status: PENDING)
  - Sets run status to WAITING_APPROVAL
  - PAUSES execution until human approves/rejects via API
  - After approval: resumes BFS from the next node
        |
        v
On FAILURE:
  - Check retry policy (exponential/linear/fixed backoff)
  - If retries exhausted: look for fallback edge
  - Fallback edge found: route to fallback node, continue BFS
  - No fallback: mark run as FAILED
  - All decisions logged in audit trail
        |
        v
All nodes complete --> run status: COMPLETED
Broadcast "run_completed" via WebSocket
```

### Real-time Updates

```
Execution Engine --> broadcastRunUpdate() --> WebSocket Server (/ws)
                                                    |
                                             Frontend listener
                                          (useExecutionStream hook)
                                                    |
                                             Nodes light up on canvas,
                                             status badges update,
                                             decision timeline populates
```

---

## Execution Engine

The execution engine is the core of the backend (`/primary-backend/src/router/execution.ts`). It processes workflow nodes using BFS traversal with a 5-minute timeout.

### Node Executor Factory

`/primary-backend/src/execution/factory.ts` maps each node type to its executor class:

| Node Type | Executor | What It Does |
|-----------|----------|-------------|
| `trigger.webhook` | TriggerExecutor | Passes through incoming webhook payload |
| `trigger.schedule` | TriggerExecutor | Handles cron-based triggers |
| `agent` (all subtypes) | AIAgentExecutor | **Calls LLM in real-time** via Vercel AI SDK |
| `tool.http` | HTTPExecutor | Makes REST API calls |
| `tool.database` | DatabaseExecutor | Runs SQL queries |
| `tool.email` | EmailExecutor | Sends emails via SMTP/SendGrid |
| `tool.slack` | SlackExecutor | Posts to Slack channels |
| `tool.browser` | BrowserExecutor | Playwright browser automation |
| `orchestrator.conditional` | ConditionalExecutor | If/Else branching |
| `orchestrator.parallel` | ParallelExecutor | Runs branches concurrently |
| `orchestrator.loop` | LoopExecutor | ForEach iteration |
| `validation` | ValidationExecutor | Schema/AI validation |
| `approval` | ApprovalExecutor | Pauses execution for human review |
| `error_handling` | RetryExecutor | Retry policies + fallback routing |
| `monitor.workflow` | SLAExecutor | SLA tracking + alerting |
| `audit.log` | AuditExecutor | Decision trail logging |

### AI Agent Executor

The AI agent executor (`/primary-backend/src/nodes/agents/executor.ts`) makes real LLM calls:

1. Initializes LLM client via Vercel AI SDK (`@ai-sdk/openai` with configurable base URL)
2. Creates tool definitions from the node's `tools_allowed` config
3. Initializes memory store if configured (Pinecone, Weaviate, ChromaDB)
4. Executes based on agent type:
   - **Planner** -- Creates execution plans from goals
   - **Executor** -- Iteratively uses tools to accomplish tasks
   - **Analyzer** -- Analyzes data and provides structured insights
   - **Recovery** -- Determines recovery strategies from errors
5. Returns structured result with reasoning, tool calls, confidence score

### Self-Healing Pipeline

```
Node execution fails
        |
        v
Check retry policy (configured per node)
        |
        +--> Retries remaining? --> Wait (backoff) --> Retry execution
        |
        +--> Retries exhausted? --> Look for fallback edge
                    |
                    +--> Fallback edge exists? --> Route to fallback node
                    |                              (continue BFS from there)
                    |
                    +--> No fallback? --> Mark step FAILED
                                         Broadcast "step_failed"
                                         Mark run FAILED
```

Fallback edges are identified by:
- `condition.type === "fallback"` on the edge
- Edge label containing the word "fallback"

Every self-healing decision is logged in the audit trail with reasoning.

---

## Database Schema

Key models in PostgreSQL (managed via Prisma):

| Model | Purpose |
|-------|---------|
| `User` | Accounts with roles (ADMIN/EDITOR/VIEWER) |
| `Workspace` | Team isolation, per-workspace OAuth app credentials |
| `WorkspaceMember` | User-workspace membership with role |
| `Workflow` | Workflow definitions with version support |
| `WorkflowVersion` | Snapshot of nodes/edges at each save |
| `WorkflowNode` | Individual node config, position, retry settings |
| `WorkflowEdge` | Connections between nodes, conditional logic, fallback edges |
| `WorkflowRun` | Single execution instance (RUNNING/COMPLETED/FAILED/WAITING_APPROVAL/CANCELLED) |
| `RunStep` | Each step of a run with input/output payloads and AI reasoning |
| `Approval` | Human approval gates (PENDING/APPROVED/REJECTED/MODIFIED) |
| `Template` | Reusable workflow templates (public/private) |
| `Secret` | AES-256 encrypted workspace secrets |
| `ApiKey` | Scoped API keys (READ/WRITE/EXECUTE/ADMIN) |
| `Connection` | External integration credentials (encrypted) |
| `AuditLog` | Action audit trail (run.started, step.completed, approval.approved, etc.) |
| `Artifact` | Workflow output files |

---

## Component Catalog

The Component Catalog (`/primary-backend/src/router/componentCatalog.ts`) is the single source of truth for all 30+ node types. It defines:

- **Node metadata** -- Name, description, icon, category
- **Configuration fields** -- What the user fills in per node type
- **Validation schemas** -- Zod schemas for server-side validation before execution
- **Input/output schemas** -- Data contracts between nodes

The frontend fetches this catalog (`GET /api/v1/components`) to dynamically render config forms for each node type.

---

## Security Model

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT tokens with configurable expiry, bcrypt password hashing |
| **Authorization** | RBAC per workspace (Admin/Editor/Viewer) |
| **Secrets** | AES-256 encrypted, referenced as `{{secrets.KEY_NAME}}` in node configs |
| **API Keys** | Scoped permissions (READ/WRITE/EXECUTE/ADMIN), workspace-bound |
| **Credentials** | Integration credentials encrypted at rest via Connection Manager |
| **CORS** | Configured for frontend origin only |
| **Validation** | All node configs validated server-side before execution |

---

## Integration System

AutoChain AI supports 18+ external service connections:

| Category | Services |
|----------|----------|
| **Cloud** | Google (OAuth), GitHub, AWS |
| **Communication** | Slack, Email (SMTP/SendGrid), Twilio |
| **Productivity** | Jira, Notion, Google Docs/Sheets/Calendar/Meet |
| **Databases** | PostgreSQL, MySQL, MongoDB |
| **Payments** | Stripe |
| **AI** | Any OpenAI-compatible API (Groq, OpenAI, OpenRouter, Ollama) |
| **Custom** | Generic API with basic/bearer/OAuth2 auth |

All credentials are managed through the Connection Manager with:
- AES-256 encryption at rest
- Per-connection RBAC
- Automatic OAuth2 token refresh
- Connection validation/testing
