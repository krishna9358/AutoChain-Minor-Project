# AgentFlow AI — Enterprise No-Code Multi-Agent Workflow Automation Platform

> Design, generate, and execute AI-powered workflows with enterprise-grade observability

## 🚀 Quick Start

### One Command Development

```bash
# Clone and start everything
git clone <your-repo-url>
cd minor-project
./dev

# Or with explicit command
./dev up
```

That's it! The `dev` command will:
- ✅ Create all required environment files
- ✅ Build and start all Docker containers
- ✅ Set up PostgreSQL with proper extensions
- ✅ Configure Kafka for event processing
- ✅ Start all microservices in the correct order
- ✅ Enable hot-reload for development
- ✅ Display service URLs and status

### Access the Application

Once everything is running, open:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Webhooks**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Kafka**: localhost:9094

**Default Credentials** (Dev Mode):
- Email: demo@agentflow.ai
- Password: demo123
- Or use the demo mode - no login required!

## 📋 Development Commands

The `dev` command provides everything you need:

```bash
./dev                  # Start all services (same as up)
./dev up              # Start all services
./dev down            # Stop all services
./dev logs            # View logs from all services
./dev status          # Show service status
./dev reset           # Reset everything (removes volumes)
./dev build           # Build all services
./dev clean           # Clean up Docker resources
./dev help            # Show help message
```

## 🏗️ Architecture

### Microservices Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentFlow AI Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Frontend   │  │    Hooks     │  │   Backend    │         │
│  │   (Next.js)  │  │  (Express)   │  │   (Express)   │         │
│  │   :3000      │  │    :3002     │  │    :3001     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         │                 │                 │                  │
│         └─────────────────┴─────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│         ┌───────────────────────────────────┐                   │
│         │        PostgreSQL                 │                   │
│         │    (Database + Outbox)           │                   │
│         │           :5432                   │                   │
│         └───────────────┬─────────────────┘                   │
│                         │                                       │
│         ┌───────────────┴─────────────────┐                   │
│         │                                 │                   │
│         ▼                                 ▼                   │
│  ┌──────────────┐                 ┌──────────────┐           │
│  │  Processor   │                 │    Worker    │           │
│  │  (Outbox→Kafka)               │  (Kafka→Actions)          │
│  └──────┬───────┘                 └──────┬───────┘           │
│         │                                 │                   │
│         └───────────────┬─────────────────┘                   │
│                         │                                     │
│                         ▼                                     │
│         ┌───────────────────────────────┐                    │
│         │          Kafka               │                    │
│         │    (Event Streaming)         │                    │
│         │          :9094               │                    │
│         └───────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Services

#### Frontend (Next.js 14)
- Visual workflow builder with React Flow
- AI-powered workflow generation
- Real-time execution monitoring
- Modern UI with shadcn/ui components

#### Backend API (Express.js)
- RESTful API for all operations
- JWT authentication
- Workflow CRUD operations
- Execution engine
- Template management

#### Hooks Service
- Webhook receiver
- Event ingestion
- Real-time notifications
- Integration with external systems

#### Processor (Outbox Pattern)
- Reads events from database outbox
- Publishes to Kafka
- Ensures reliable event delivery
- Handles retries and error recovery

#### Worker (Event Consumer)
- Consumes events from Kafka
- Executes workflow actions
- Processes AI agent tasks
- Handles approvals and human-in-loop

#### PostgreSQL
- Primary data store
- Outbox pattern for events
- Audit logging
- Performance metrics

#### Kafka
- Event streaming platform
- Reliable message delivery
- Scalable processing
- Event sourcing

## 🎯 Core Features

### 1. AI Workflow Generator
Describe workflows in natural language → AI generates the complete graph.

**Supported patterns:**
- Meeting Intelligence
- Customer Support
- Sales Lead Qualification
- Invoice Processing
- Employee Onboarding
- Incident Response

### 2. Visual Workflow Builder (Design Mode)
- Drag & drop nodes from palette
- Connect nodes with edges
- Configure node properties
- Inline JSON configuration
- Zoom, pan, minimap

**Node Categories:**
| Category | Types |
|----------|-------|
| Triggers | Webhook, Schedule, File Upload, API |
| AI Agents | Extraction, Summarization, Classification, Reasoning, Decision, Verification, Compliance |
| Logic | If/Else, Switch, Loop, Parallel |
| Actions | Slack, Email, HTTP, API Call, Database |
| Control | Delay, Approval, Retry, Error Handler |

### 3. Execution Mode
- Live workflow execution visualization
- Node-by-node status tracking
- Real-time progress updates
- Step-by-step I/O inspection

### 4. Logs & Observability
Each execution logs:
- Input/output payload per node
- AI reasoning summaries
- Execution times
- Error messages
- Retry counts

### 5. Human-in-the-Loop
- Approval nodes pause execution
- Approve/reject/modify workflow
- Resume from approval point

### 6. Template Library
10+ pre-built enterprise templates ready to deploy.

### 7. Version Control
- Full workflow version history
- One-click rollback

## 🔧 Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Environment Configuration

The `dev` command automatically creates all necessary environment files. However, you can customize them:

```bash
# Frontend
frontend/.env.local

# Backend
primary-backend/.env

# Hooks
hooks/.env

# Processor
processor/.env

# Worker
worker/.env
```

### Hot Reload

All services are configured for hot reload during development:

- **Frontend**: Next.js hot reload
- **Backend**: Nodemon (via Docker volumes)
- **Hooks**: Nodemon (via Docker volumes)
- **Processor**: Nodemon (via Docker volumes)
- **Worker**: Nodemon (via Docker volumes)

Changes to source files are automatically reflected without rebuilding containers.

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/user/signup | Create account |
| POST | /api/v1/user/login | Authenticate |
| GET | /api/v1/user/me | Get profile |
| POST | /api/v1/workflows | Create workflow |
| GET | /api/v1/workflows | List workflows |
| GET | /api/v1/workflows/:id | Get workflow |
| PUT | /api/v1/workflows/:id | Update workflow |
| DELETE | /api/v1/workflows/:id | Delete workflow |
| POST | /api/v1/execution/run/:id | Execute workflow |
| GET | /api/v1/execution/run/:id | Get run details |
| GET | /api/v1/execution/runs | Get all runs |
| GET | /api/v1/execution/logs/:id | Get step logs |
| POST | /api/v1/generate/workflow | AI generate |
| GET | /api/v1/templates | List templates |
| POST | /api/v1/approvals/:id | Approve/reject |
| GET | /api/v1/audit | Get audit logs |

## 🐳 Docker Services

### Database (PostgreSQL)
```bash
# Connect to database
docker exec -it agentflow-db psql -U postgres -d agentflow

# View logs
docker logs agentflow-db -f
```

### Kafka
```bash
# List topics
docker exec -it agentflow-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Create topic
docker exec -it agentflow-kafka kafka-topics.sh --bootstrap-server localhost:9092 --create --topic my-topic --partitions 3

# Consume messages
docker exec -it agentflow-kafka kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic workflow.events --from-beginning
```

### All Services
```bash
# View all logs
./dev logs

# View specific service logs
docker logs agentflow-backend -f
docker logs agentflow-frontend -f
docker logs agentflow-worker -f
```

## 🔐 Security

- JWT authentication
- Workspace isolation
- RBAC roles (Admin/Editor/Viewer)
- Audit trail logging
- Encrypted secrets
- Rate limiting

## 🚨 Troubleshooting

### Services won't start
```bash
# Check service status
./dev status

# View logs
./dev logs

# Reset everything (this will delete all data)
./dev reset
```

### Database connection issues
```bash
# Restart database
docker restart agentflow-db

# Check database health
docker exec agentflow-db pg_isready -U postgres
```

### Kafka connection issues
```bash
# Restart Kafka
docker restart agentflow-kafka agentflow-zookeeper

# Check Kafka logs
docker logs agentflow-kafka -f
```

### Port already in use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill the process
kill -9 <PID>
```

### Build issues
```bash
# Clean and rebuild
./dev clean
./dev build
./dev up
```

## 📊 Monitoring & Observability

### Health Checks

All services expose health endpoints:

```bash
# Backend
curl http://localhost:3001/health

# Hooks
curl http://localhost:3002/health

# Frontend
curl http://localhost:3000
```

### Metrics

- Workflow execution metrics
- Performance tracking
- Error rates
- Custom metrics via Prometheus (optional)

### Logs

Logs are available via:
- `./dev logs` - All services
- Docker logs per service
- Database audit logs

## 🎨 Tech Stack

### Frontend
- Next.js 14 (App Router)
- React Flow (Workflow visualization)
- shadcn/ui (UI components)
- Tailwind CSS (Styling)
- Framer Motion (Animations)
- Vercel AI SDK (AI integration)

### Backend
- Express.js (API)
- PostgreSQL (Database)
- Kafka (Event streaming)
- Prisma (ORM)
- OpenAI (AI models)
- JWT (Authentication)

### Infrastructure
- Docker (Containerization)
- Docker Compose (Orchestration)
- Nginx (Reverse proxy - production)

## 🚀 Deployment

### Production Build

```bash
# Build all services
./dev build

# Start production containers
docker compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure random string
- `OPENAI_API_KEY` - OpenAI API key
- `KAFKA_BROKER` - Kafka broker URL

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `./dev` to test
5. Submit a pull request

## 📞 Support

- Documentation: https://docs.agentflow.ai
- Issues: https://github.com/agentflow/agentflow/issues
- Email: support@agentflow.ai

---

**Built with ❤️ by the AgentFlow AI team**