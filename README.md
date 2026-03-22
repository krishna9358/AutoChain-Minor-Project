# AutoChain AI — Enterprise Workflow Automation Platform

> Multi-agent AI system for autonomous enterprise workflows with self-healing execution, decision audit trails, and SLA monitoring.

## Problem Statement

Design a multi-agent system that takes ownership of complex, multi-step enterprise processes. It should detect failures, self-correct, and complete the job with minimal human involvement — while keeping an auditable trail of every decision it makes.

## Key Features

### Multi-Agent Workflow Engine
- Visual drag-and-drop workflow builder with React Flow
- AI-powered workflow generation from natural language descriptions
- 30+ pre-built node types (AI agents, tools, orchestrators, triggers)
- Sequential and parallel execution with conditional branching

### Self-Healing Execution
- Automatic fallback routing when nodes fail after retries
- Configurable retry policies with exponential/linear/fixed backoff
- Error classification and intelligent recovery paths
- Full audit trail of self-healing decisions

### Decision Audit Trail
- Every AI agent decision logged with reasoning summary
- Timeline visualization of agent decisions per workflow run
- Self-healed and failed steps highlighted for review
- Input/output inspection for full transparency

### SLA Monitoring
- Per-node execution time tracking vs expected durations
- Health dashboard with breach detection and warnings
- Historical performance analysis across runs

### Enterprise Features
- Workspace isolation with RBAC (Admin/Editor/Viewer)
- Encrypted secret management (AES-256)
- API key management with scoped permissions
- Google OAuth integration (Calendar, Docs, Sheets, Meet)
- Human-in-the-loop approval gates
- Real-time execution streaming via WebSocket

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Frontend   │────▶│   Backend    │────▶│ PostgreSQL│
│  (Next.js)   │     │  (Express)   │     │           │
│  Port 3000   │     │  Port 3001   │     │ Port 5432 │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │
                    ┌──────▼───────┐
                    │    Kafka     │
                    │  Port 9094   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼──────┐
        │ Processor │ │  Worker  │ │  Hooks   │
        │ (Outbox)  │ │(Consumer)│ │(Webhooks)│
        └──────────┘ └──────────┘ │ Port 3002│
                                  └──────────┘
```

**Event Flow:** Trigger --> Backend --> Outbox Table --> Processor --> Kafka --> Worker --> Execute Actions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React Flow, shadcn/ui, Tailwind CSS, Framer Motion |
| Backend | Express.js, Prisma ORM, TypeScript |
| Database | PostgreSQL 16 |
| Messaging | Apache Kafka (Confluent 7.6) |
| AI/LLM | Groq (primary), OpenRouter (fallback) |
| Infrastructure | Docker, Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for manual setup only)
- A Groq API key (free at [console.groq.com](https://console.groq.com)) or OpenRouter API key

### 1. Clone & Configure

```bash
git clone <repo-url>
cd minor-project
```

Copy each service's example env file:

```bash
cp .env.example .env
cp primary-backend/.env.example primary-backend/.env
cp frontend/.env.local.example frontend/.env.local
cp hooks/.env.example hooks/.env
cp processor/.env.example processor/.env
cp worker/.env.example worker/.env
```

Edit `primary-backend/.env` and add your LLM API key:

```env
DATABASE_URL=postgresql://postgres:autochain_dev@localhost:5432/autochain
JWT_SECRET=autochain-dev-secret-key-change-in-production
ENCRYPTION_KEY=autochain-dev-encryption-key-32ch
GROQ_API_KEY=your-groq-api-key-here
# Or use OpenRouter instead:
# OPENROUTER_API_KEY=your-openrouter-key
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts all 7 services: **PostgreSQL, Kafka, Zookeeper, Backend (3001), Frontend (3000), Processor, Worker, Hooks (3002)**.

The backend automatically runs Prisma migrations and seeds demo data on first start.

### 3. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |
| Webhooks | http://localhost:3002 |

**Dev Mode** (enabled by default): Auto-creates a demo user (`dev@autochain.ai` / `dev123`) with an Admin workspace -- no signup required.

### Manual Setup (without Docker)

Requires PostgreSQL and Kafka running locally.

```bash
# Install dependencies
cd primary-backend && yarn install && cd ..
cd frontend && yarn install && cd ..
cd processor && npm install && cd ..
cd worker && npm install && cd ..
cd hooks && yarn install && cd ..

# Setup database
cd primary-backend
npx prisma generate
npx prisma db push
npx prisma db seed   # Seeds templates including Employee Onboarding demo
cd ..

# Start services (each in its own terminal)
cd primary-backend && yarn dev
cd frontend && yarn dev
cd processor && npm run dev
cd worker && npm run dev
cd hooks && yarn dev
```

## Node Categories

| Category | Types |
|----------|-------|
| Triggers | Webhook, Schedule, File Upload, API |
| AI Agents | Extraction, Summarization, Classification, Reasoning, Decision, Verification, Compliance |
| Logic | If/Else, Switch, Loop, Parallel |
| Actions | Slack, Email, HTTP, API Call, Database |
| Control | Delay, Approval, Retry, Error Handler |

## Demo Workflow: Enterprise Employee Onboarding

The platform includes a showcase template demonstrating multi-agent collaboration:

1. **New Hire Entry** -- Webhook receives hire data
2. **Data Validation Agent** -- Validates completeness, enriches missing fields
3. **Background Verification Agent** -- Runs identity/employment/education checks
4. **IT Provisioning Agent** -- Creates email, Slack, GitHub accounts by role
5. **HR Compliance Agent** -- Verifies tax forms, NDAs, benefits enrollment
6. **Manager Approval** -- Human-in-the-loop review gate
7. **Notification Agent** -- Sends welcome email, Slack intro, calendar invites
8. **Onboarding Audit Agent** -- Produces comprehensive decision audit trail

**Self-Healing Paths:**
- Background check failure --> Routes to Manual Review (approval node)
- IT provisioning failure --> Routes to IT Helpdesk Escalation (email notification)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/signup` | Create account |
| POST | `/api/v1/user/login` | Authenticate |
| GET | `/api/v1/user/me` | Get current user profile |
| GET | `/api/v1/workflows` | List workflows |
| POST | `/api/v1/workflows` | Create workflow |
| GET | `/api/v1/workflows/:id` | Get workflow details |
| PUT | `/api/v1/workflows/:id` | Update workflow |
| DELETE | `/api/v1/workflows/:id` | Delete workflow |
| POST | `/api/v1/execution/run/:id` | Execute workflow |
| GET | `/api/v1/execution/run/:id` | Get run details |
| GET | `/api/v1/execution/runs` | List all runs |
| GET | `/api/v1/execution/runs/:runId/decisions` | Decision audit trail |
| GET | `/api/v1/execution/sla-health` | SLA health metrics |
| POST | `/api/v1/generate/workflow` | AI-generate workflow from prompt |
| GET | `/api/v1/templates` | List workflow templates |
| GET | `/api/v1/audit` | Audit logs |
| POST | `/api/v1/approvals/:id` | Approve or reject gate |
| GET | `/api/v1/workspaces` | List workspaces |
| POST | `/api/v1/secrets` | Manage encrypted secrets |
| POST | `/api/v1/api-keys` | Manage API keys |
| GET | `/api/v1/integrations/google` | Google OAuth flows |
| GET | `/api/v1/components` | Component catalog |

## Project Structure

```
minor-project/
├── frontend/            # Next.js 14 app (React Flow canvas, dashboards)
│   ├── app/             #   App Router pages
│   ├── components/      #   UI components (workflow builder, providers)
│   ├── lib/             #   API client, auth helpers
│   ├── store/           #   Zustand state management
│   └── hooks/           #   Custom React hooks
├── primary-backend/     # Express API server
│   ├── prisma/          #   Database schema, migrations & seed
│   └── src/
│       ├── router/      #   Route handlers (user, workflow, execution, etc.)
│       ├── execution/   #   Workflow execution engine & factory
│       ├── nodes/       #   Node type executors (agents, tools, orchestrators)
│       ├── encryption/  #   AES-256 secret management
│       ├── connections/ #   Third-party integration manager
│       └── middleware/  #   Auth middleware
├── processor/           # Outbox processor (PostgreSQL --> Kafka)
├── worker/              # Kafka consumer (executes workflow actions)
├── hooks/               # Webhook receiver service
├── docker-compose.yml   # Full-stack orchestration (7 services)
└── .env.example         # Root environment template
```

## Troubleshooting

### Services won't start
```bash
docker compose ps          # Check service status
docker compose logs -f     # Stream all logs
docker compose down -v     # Reset everything (removes volumes)
docker compose up -d       # Start fresh
```

### Database connection issues
```bash
docker exec autochain-db pg_isready -U postgres
docker restart autochain-db
```

### Kafka connection issues
```bash
docker restart autochain-kafka autochain-zookeeper
docker logs autochain-kafka -f
```

### Port conflicts
```bash
lsof -i :3000   # Frontend
lsof -i :3001   # Backend
lsof -i :3002   # Hooks
lsof -i :5432   # PostgreSQL
lsof -i :9094   # Kafka
```

## Impact Model

| Metric | Manual Process | With AutoChain |
|--------|---------------|----------------|
| Onboarding time | 4-8 hours | 15-30 minutes |
| Human touchpoints | 12+ per process | 1-2 (approval gates only) |
| Error detection | ~70% (human review) | ~95% (AI verification) |
| Cost per workflow | $200-400 (labor) | $5-10 (API costs) |
| Weekly savings (50 workflows) | -- | **$15,000+** |

## Team

Built for ET AI Hackathon 2026

## License

MIT
