# AutoChain AI -- Enterprise Workflow Automation Platform

> Multi-agent AI system for autonomous enterprise workflows with self-healing execution, decision audit trails, and SLA monitoring.

Built for **ET AI Hackathon 2026**

---

## Problem Statement

Enterprises run hundreds of multi-step processes daily -- customer support, employee onboarding, invoice processing, sales outreach. These involve multiple teams, tools, and handoffs. When something breaks, it takes hours to detect. There's no audit trail of why decisions were made.

**AutoChain AI** solves this by letting you build visual workflows where AI agents handle each step autonomously. The system self-heals when things go wrong, maintains a complete decision audit trail, and supports human-in-the-loop approval gates -- all with minimal human involvement.

## Key Features

- **Visual Workflow Builder** -- Drag-and-drop canvas with 30+ node types, powered by React Flow
- **Real AI Execution** -- AI agent nodes call LLMs in real-time for classification, reasoning, and decision-making
- **Self-Healing Execution** -- Configurable retry policies with automatic fallback routing on failure
- **Decision Audit Trail** -- Every AI decision logged with reasoning, input/output, and timestamps
- **Human-in-the-Loop** -- Approval gates with configurable timeouts that pause workflow execution
- **SLA Monitoring** -- Per-node execution tracking with breach detection and alerts
- **AI Workflow Generation** -- Describe what you want in natural language, get a complete workflow
- **Enterprise Security** -- Workspace isolation, AES-256 encrypted secrets, RBAC, scoped API keys
- **Real-time Updates** -- WebSocket streaming of execution progress to the UI
- **LLM-Agnostic** -- Works with any OpenAI-compatible provider (Groq, OpenAI, OpenRouter, Ollama)

## Architecture

```
                    +----------------------------+
                    |         Frontend           |
                    |   Next.js 14 + React Flow  |
                    |      (Port 3000)           |
                    +-----------+----------------+
                                |
                       REST API + WebSocket
                                |
                    +-----------v----------------+
                    |      Primary Backend       |
                    |   Express.js + TypeScript  |
                    |  (API + Execution Engine)  |
                    |      (Port 3001)           |
                    +-----------+----------------+
                                |
                    +-----------v----------------+
                    |      PostgreSQL 16         |
                    |      (Port 5432)           |
                    +----------------------------+
```

**Execution Flow:** User triggers workflow --> Backend validates nodes --> Execution engine processes nodes via BFS --> AI agents call LLM in real-time --> Results stored in PostgreSQL --> WebSocket broadcasts progress to frontend

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React Flow, shadcn/ui, Tailwind CSS, Framer Motion, Zustand |
| Backend | Express.js, TypeScript, Prisma ORM, JWT Auth |
| Database | PostgreSQL 16 |
| AI/LLM | Vercel AI SDK (any OpenAI-compatible provider -- Groq, OpenAI, OpenRouter, Ollama) |
| Real-time | WebSocket (execution progress streaming) |
| Security | AES-256 encryption, RBAC, scoped API keys |
| Infrastructure | Docker, Docker Compose (3 services) |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- An API key for any OpenAI-compatible provider (e.g., [Groq](https://console.groq.com) -- free tier available)

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd minor-project

# Copy environment files
cp .env.example .env
cp primary-backend/.env.example primary-backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `primary-backend/.env` and set your AI API key:

```env
AI_API_KEY=your-groq-api-key-here
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

Works with any OpenAI-compatible API -- just change the base URL:
- **Groq (recommended, free):** `https://api.groq.com/openai/v1`
- **OpenRouter:** `https://openrouter.ai/api/v1`
- **OpenAI:** `https://api.openai.com/v1`
- **Ollama (local):** `http://localhost:11434/v1`

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts **3 services**: PostgreSQL, Backend (port 3001), Frontend (port 3000).

The backend automatically runs Prisma migrations and seeds demo templates on first start.

### 3. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

**Dev Mode** (enabled by default): Auto-creates a demo user -- no signup required.
- **Email:** `dev@autochain.ai`
- **Password:** `dev123`

### Manual Setup (without Docker)

Requires PostgreSQL running locally.

```bash
# Install dependencies
cd primary-backend && yarn install && cd ..
cd frontend && yarn install && cd ..

# Setup database
cd primary-backend
npx prisma generate
npx prisma db push
npx prisma db seed   # Seeds templates
cd ..

# Start services (each in its own terminal)
cd primary-backend && yarn dev
cd frontend && yarn dev
```

## Node Types

| Category | Types | Description |
|----------|-------|-------------|
| **Triggers** | Webhook, Schedule, Event, API | How workflows get started |
| **AI Agents** | Extraction, Summarization, Classification, Reasoning, Decision, Verification | LLM-powered intelligence (real AI calls) |
| **Integrations** | Slack, Email, HTTP, Database, GitHub, Google (Calendar/Docs/Sheets/Meet) | Connect to external services |
| **Logic** | If/Else, Switch, Loop, Parallel | Control flow and branching |
| **Control** | Delay, Approval, Retry, Error Handler, SLA Monitor | Process management |
| **Output** | Artifact Writer, Document Generator, Audit Log, Webhook Response | Produce deliverables |

See [docs/NODES.md](docs/NODES.md) for the full node reference.

## Pre-Built Templates

| Template | Nodes | Difficulty | Description |
|----------|-------|------------|-------------|
| Customer Support Ticket Automation | 6 | Beginner | Classify tickets, generate responses, escalate when needed |
| Meeting Intelligence Automation | 7 | Beginner | Extract action items from meeting transcripts |
| Sales Lead Qualification & Outreach | 6 | Beginner | Enrich leads, score quality, automate outreach |
| Invoice Processing & Approval | 6 | Intermediate | Extract data, validate, route for approval |
| Enterprise Employee Onboarding | 10 | Advanced | Full onboarding pipeline with self-healing fallbacks |

See [docs/TEMPLATES.md](docs/TEMPLATES.md) for detailed template documentation with sample inputs.

## Demo: Customer Support Ticket Automation

The **Customer Support** template is the quickest way to see real AI execution:

1. **Open** http://localhost:3000 (auto-logged in as dev user)
2. **Go to Templates** and select "Customer Support Ticket Automation"
3. **Click "Use Template"** to load it onto the canvas
4. **Run the workflow** with this sample input:

```json
{
  "customer_name": "Sarah Johnson",
  "customer_email": "sarah@acme.com",
  "subject": "Cannot access billing dashboard",
  "description": "I keep getting a 403 error trying to access billing. This is urgent -- I need invoices for our quarterly review tomorrow.",
  "priority": "high"
}
```

5. **Watch the execution** -- nodes light up in real-time via WebSocket as each AI agent processes
6. **Check the approval gate** -- the AI escalated it due to high urgency and frustrated sentiment
7. **Approve it** and watch the workflow complete
8. **View the audit trail** -- see the reasoning behind every AI decision

For a full demo walkthrough with talking points, see [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/user/signup` | Create account |
| `POST` | `/api/v1/user/login` | Authenticate (returns JWT) |
| `GET` | `/api/v1/user/me` | Current user profile |
| `GET/POST` | `/api/v1/workflows` | List / create workflows |
| `GET/PUT/DELETE` | `/api/v1/workflows/:id` | Get / update / delete workflow |
| `POST` | `/api/v1/execution/run/:id` | Execute workflow |
| `GET` | `/api/v1/execution/runs` | List all runs |
| `GET` | `/api/v1/execution/runs/:runId/decisions` | Decision audit trail |
| `GET` | `/api/v1/execution/sla-health` | SLA health metrics |
| `POST` | `/api/v1/generate/workflow` | AI-generate workflow from prompt |
| `GET` | `/api/v1/templates` | List workflow templates |
| `POST` | `/api/v1/templates/:id/clone` | Create workflow from template |
| `POST` | `/api/v1/approvals/:id` | Approve or reject gate |
| `GET` | `/api/v1/audit` | Audit logs |
| `POST` | `/api/v1/secrets` | Manage encrypted secrets |
| `POST` | `/api/v1/api-keys` | Manage API keys |
| `GET` | `/api/v1/components` | Component catalog |

## Project Structure

```
minor-project/
├── frontend/                # Next.js 14 app (port 3000)
│   ├── app/                 #   App Router pages (dashboard, workflows, login)
│   ├── components/          #   UI components (workflow builder, node forms)
│   ├── hooks/               #   Custom hooks (useExecutionStream for WebSocket)
│   ├── lib/                 #   API client, auth helpers
│   ├── store/               #   Zustand state management (with undo/redo)
│   └── templates/           #   Workflow template YAML files
├── primary-backend/         # Express API server (port 3001)
│   ├── prisma/              #   Database schema, migrations & seed
│   └── src/
│       ├── router/          #   Route handlers (workflows, execution, auth, integrations)
│       ├── execution/       #   Node executor factory + integration executors
│       ├── nodes/           #   Node type executors (AI agents, tools, orchestrators)
│       ├── encryption/      #   AES-256 secret management
│       ├── connections/     #   Third-party credential manager
│       ├── utils/           #   WebSocket broadcast, AI provider setup
│       └── middleware/      #   JWT auth middleware
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      #   System architecture deep-dive
│   ├── NODES.md             #   Complete node reference guide
│   ├── TEMPLATES.md         #   Template documentation with sample inputs
│   └── DEMO_SCRIPT.md      #   Demo video script & end-to-end setup guide
├── docker-compose.yml       # 3 services: PostgreSQL, Backend, Frontend
└── .env.example             # Root environment template
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@localhost:5432/autochain` |
| `JWT_SECRET` | Token signing key | Any secure random string |
| `ENCRYPTION_KEY` | AES-256 key (32 characters) | Any 32-character string |
| `AI_API_KEY` | LLM provider API key | Your Groq/OpenAI key |
| `AI_BASE_URL` | LLM provider base URL | `https://api.groq.com/openai/v1` |
| `AI_MODEL` | Model name | `llama-3.3-70b-versatile` |

### Optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID (or configure per-workspace in UI) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `FRONTEND_URL` | Frontend URL for OAuth redirects |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Services won't start | `docker compose down -v && docker compose up -d` |
| Database connection issues | `docker exec autochain-db pg_isready -U postgres` |
| Port conflicts | `lsof -i :3000` / `lsof -i :3001` / `lsof -i :5432` |
| No templates showing | `docker exec autochain-backend npx prisma db seed` |
| AI nodes failing | Check `AI_API_KEY` is set correctly in `primary-backend/.env` |
| Nodes don't light up | Refresh the page (WebSocket reconnects automatically) |

## Impact Model

| Metric | Manual Process | With AutoChain AI |
|--------|---------------|-------------------|
| Onboarding time | 4-8 hours | 15-30 minutes |
| Human touchpoints | 12+ per process | 1-2 (approval gates only) |
| Error detection | ~70% (human review) | ~95% (AI verification) |
| Cost per workflow | $200-400 (labor) | $5-10 (API costs) |
| Weekly savings (50 workflows) | -- | **$15,000+** |

## Documentation

- [Architecture Deep-Dive](docs/ARCHITECTURE.md) -- System design, execution engine, data flow
- [Node Reference](docs/NODES.md) -- All 30+ node types with configuration
- [Template Guide](docs/TEMPLATES.md) -- Pre-built templates with sample JSON inputs
- [Demo Script](docs/DEMO_SCRIPT.md) -- Video script with step-by-step setup from zero
- [Workflow Engine](primary-backend/WORKFLOW_SYSTEM_README.md) -- Backend execution engine docs

## License

MIT
