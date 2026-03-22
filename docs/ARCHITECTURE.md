# Architecture Overview

AgentFlow is a visual workflow automation platform that lets you build, run, and monitor multi-step enterprise processes using a drag-and-drop interface powered by AI agents.

## System Architecture

```
                    ┌─────────────────────────────┐
                    │         Frontend             │
                    │   Next.js + React Flow       │
                    │   (Visual Workflow Editor)    │
                    └──────────┬──────────────────-─┘
                               │ REST API + WebSocket
                    ┌──────────▼──────────────────-─┐
                    │      Primary Backend          │
                    │   Express + TypeScript         │
                    │   (API, Execution Engine)      │
                    └──────────┬──────────────────-─┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───┐   ┌───────▼────┐   ┌───────▼────┐
     │ PostgreSQL  │   │   Kafka    │   │  Worker    │
     │ (Database)  │   │ (Events)   │   │ (Jobs)     │
     └─────────────┘   └────────────┘   └────────────┘
```

## Key Components

### Frontend (`/frontend`)
- **Framework:** Next.js 14 with TypeScript
- **Canvas:** @xyflow/react (React Flow) for the visual workflow editor
- **State:** Zustand store with auto-save
- **Styling:** Tailwind CSS
- **Real-time:** WebSocket for live execution updates

### Primary Backend (`/primary-backend`)
- **Framework:** Express.js with TypeScript
- **Validation:** Zod schemas for all node configs
- **AI:** Vercel AI SDK (supports Groq, OpenRouter, OpenAI, Ollama)
- **Auth:** JWT-based authentication
- **Database:** PostgreSQL with Prisma ORM

### Supporting Services
- **Processor** (`/processor`) — Workflow execution engine
- **Worker** (`/worker`) — Background job processing
- **Hooks** (`/hooks`) — Webhook handling

## How It Works

### 1. Build
Users drag nodes from the palette onto the canvas, connect them with edges, and configure each node's settings.

### 2. Validate
When a workflow is saved, the backend validates every node's config against its Zod schema via the Component Catalog API.

### 3. Execute
The execution engine processes nodes sequentially following the edge connections. Each node type has a dedicated executor class that handles the actual work (API calls, AI inference, email sending, etc.).

### 4. Monitor
Real-time execution status streams to the frontend via WebSocket. SLA monitors track deadlines, and audit logs record every decision.

## Data Flow

```
User Action → React Flow Canvas → Zustand Store → Auto-save → Backend API
                                                                    │
Backend API → Validate Nodes → Save to PostgreSQL → Return Success  │
                                                                    │
Run Workflow → Execution Engine → Node Executors → Results          │
                    │                                               │
                    └──── WebSocket ──── Real-time UI Updates ──────┘
```

## Component Catalog

The Component Catalog (`/primary-backend/src/router/componentCatalog.ts`) is the single source of truth for all node types. It defines:
- Node metadata (name, description, icon, category)
- Configuration fields (what the user fills in)
- Validation schemas (Zod)
- Input/output schemas

The frontend fetches this catalog to dynamically render config forms for each node type.

## Template System

Templates are stored as YAML files in `/frontend/templates/`. Each template defines:
- Metadata (name, description, category, difficulty)
- Nodes with positions and pre-filled configs
- Edges defining the workflow flow

Templates can be imported/exported as YAML files, making them shareable and version-controllable.

## Security

- JWT authentication with configurable expiry
- Secrets stored separately and referenced via `{{secrets.KEY_NAME}}`
- CORS configured for frontend origin
- Webhook signature verification
- Node configs validated server-side before execution
