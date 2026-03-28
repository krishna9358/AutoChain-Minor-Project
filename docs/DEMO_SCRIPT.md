# AutoChain AI - Demo Video Script

> **Total Duration:** ~8-10 minutes
> **Recommended Template for Demo:** Customer Support Ticket Automation (simplest real end-to-end flow)



## Part 0: Setup From Zero (~5 min, do this BEFORE recording)

### What You Need
- Docker Desktop installed and running
- A free Groq API key (get one at https://console.groq.com/keys -- takes 30 seconds)

### Step-by-Step Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd minor-project

# 2. Copy environment files (only 3 needed)
cp .env.example .env
cp primary-backend/.env.example primary-backend/.env
cp frontend/.env.local.example frontend/.env.local

# 3. Add your Groq API key to primary-backend/.env
# Open primary-backend/.env and set:
#   AI_API_KEY=gsk_your_actual_groq_key_here
#   AI_BASE_URL=https://api.groq.com/openai/v1
#   AI_MODEL=llama-3.3-70b-versatile

# 4. Start everything (3 containers: PostgreSQL, Backend, Frontend)
docker compose up -d

# 5. Wait ~30 seconds for services to boot
docker compose ps   # all 3 should show "healthy" or "running"

# 6. Seed the database with templates (runs automatically on first start)
# If templates don't appear, manually seed:
docker exec autochain-backend npx prisma db seed
```

### Verify It Works
1. Open http://localhost:3000
2. You're auto-logged in as `dev@autochain.ai` (dev mode, no login needed)
3. You should see the dashboard

### Pre-Demo Checklist
- [ ] Docker running, all 3 containers healthy
- [ ] Groq API key set in `primary-backend/.env`
- [ ] http://localhost:3000 loads the dashboard
- [ ] Templates visible in the template library
- [ ] Browser zoomed to 90-100% for screen recording

---

## Part 1: Opening & Problem Statement (~1 min)

### Script

> "Hi, I'm [Name] and this is **AutoChain AI** -- an enterprise workflow automation platform powered by multi-agent AI.
>
> **The problem:** Enterprises run hundreds of multi-step processes every day -- customer support, employee onboarding, invoice processing. These involve multiple teams, multiple tools, and countless handoffs. When something breaks, there's no visibility. When AI makes a decision, there's no audit trail.
>
> **Our solution:** AutoChain AI lets you build visual workflows where AI agents handle each step. The system self-heals when things fail, keeps a complete decision audit trail of every AI decision, and supports human-in-the-loop approval gates -- all with minimal human involvement.
>
> Let me show you how it works -- from scratch."

---

## Part 2: Tech Architecture Overview (~1.5 min)

### Script

> "Let me quickly walk through the architecture."

**Show the architecture diagram:**

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
                                |
                    +-----------v----------------+
                    |    AI Provider (LLM)       |
                    |  Groq / OpenAI / Ollama    |
                    +----------------------------+
```

> "The architecture is clean and simple -- three services running in Docker:
>
> **Frontend** -- Built with Next.js 14 and React Flow. This is the visual drag-and-drop workflow builder. When you run a workflow, the frontend receives real-time execution updates over WebSocket -- you literally see each node light up as it executes.
>
> **Backend** -- Express.js with TypeScript. Handles authentication, workflow CRUD, and the **execution engine**. When you hit Run, the backend walks through each node in order using BFS traversal. For AI agent nodes, it calls the LLM in real-time via the Vercel AI SDK. For approval nodes, it pauses execution and waits for human input.
>
> **PostgreSQL** -- Stores everything: workflows, execution runs, step-by-step results with AI reasoning, encrypted secrets, audit logs. Managed through Prisma ORM.
>
> **AI Layer** -- We use the Vercel AI SDK, which works with any OpenAI-compatible API. Today we're using Groq's Llama 3.3 70B -- it's fast and free. But you could swap in GPT-4, Claude, or a local Ollama model without changing any code.
>
> All secrets are encrypted with AES-256. Workspaces provide team isolation with role-based access. Every action is logged. Three containers, one `docker compose up` command."

---

## Part 3: Live Demo - Customer Support Ticket Automation (~5 min)

### Step 1: Show the Dashboard (~20 sec)

**What to say:**
> "Here's the dashboard. You can see workflows, recent execution runs, and key metrics."

**What to do:**
1. Show http://localhost:3000/dashboard briefly
2. Point out the sidebar navigation

---

### Step 2: Load the Template (~30 sec)

**What to say:**
> "We have pre-built templates for common enterprise workflows. I'll use the Customer Support Ticket Automation template."

**What to do:**
1. Navigate to the workflow builder (click "Create Workflow" or "+" button)
2. Open the Template Library
3. Find "Customer Support Ticket Automation"
4. Click "Use Template"
5. The workflow loads onto the canvas with 6 connected nodes

---

### Step 3: Walk Through the Nodes (~1.5 min)

**What to say (click each node as you explain):**

> "This workflow has 6 nodes. Let me walk through each one:
>
> **Node 1: New Ticket** -- This is the webhook trigger. It receives the raw ticket data -- customer name, email, subject, description, and priority.
>
> **Node 2: Ticket Classifier** -- This is an AI Agent node. When this executes, it actually calls Llama 3.3 70B in real-time. The AI reads the ticket and classifies it: is it a billing issue, technical problem, feature request, or complaint? It also assesses sentiment and urgency. No rules engine -- pure AI reasoning.
>
> **Node 3: Response Generator** -- A second AI agent that drafts a professional response based on the classification. It uses the context from the previous node's output.
>
> **Node 4: Escalation Check** -- A third AI agent that makes a decision: can we auto-respond, or does this need human review? If the customer is frustrated, the issue is complex, or the priority is high -- it routes to manager approval.
>
> **Node 5: Manager Approval** -- The human-in-the-loop gate. This pauses the entire workflow and waits for a human to approve, reject, or modify the AI's work. In production, this would send a Slack or email notification.
>
> **Node 6: Notify Team** -- Sends the resolution summary to the team via Slack.
>
> So that's 3 real AI calls, 1 human approval gate, and automatic routing based on AI decisions."

---

### Step 4: Run the Workflow (~1 min)

**What to say:**
> "Now let me run this with a real support ticket. I'll use a realistic scenario."

**What to do:**
1. Click the "Run" or "Execute" button
2. When prompted for trigger data, paste this JSON:

```json
{
  "customer_name": "Sarah Johnson",
  "customer_email": "krishanmohank974@gmail.com",
  "subject": "Cannot access billing dashboard",
  "description": "I've been trying to access the billing section for the past 2 hours. I keep getting a 403 error. This is urgent because I need to download invoices for our quarterly review that's happening tomorrow morning. I've already tried clearing my cache and using a different browser. Nothing works.",
  "priority": "high"
}
```

3. Click Run/Execute

**What to say while watching:**
> "Watch the canvas -- each node lights up in real-time as it executes. The backend is sending WebSocket updates for every step.
>
> The Ticket Classifier is calling Llama 3.3 right now... done. Now the Response Generator is drafting a reply... and the Escalation Check is deciding whether to escalate."

---

### Step 5: Show the Results (~1 min)

**What to do:**
1. Click on the execution run to see step details
2. Click on each completed step

**What to say:**
> "Let's see what the AI actually decided.
>
> The **Ticket Classifier** categorized this as a Technical Issue with High urgency and Frustrated sentiment. That's accurate -- the customer mentioned a 403 error, they've been trying for 2 hours, and there's a deadline tomorrow.
>
> The **Response Generator** drafted a professional response acknowledging the 403 error, providing troubleshooting steps, and offering to escalate to the engineering team.
>
> The **Escalation Check** decided to escalate -- because the priority is high and the sentiment is frustrated. So the workflow is now paused at the Manager Approval gate."

3. Navigate to the Approvals section
4. Show the pending approval with the AI's classification and drafted response
5. Click "Approve"

> "The manager sees the full context -- the AI's classification, the drafted response, and can approve, reject, or modify it. I'll approve this one."

6. Show the workflow completing after approval

---

### Step 6: Show the Audit Trail (~30 sec)

**What to say:**
> "And here's the critical differentiator -- the **decision audit trail**. Every AI decision is logged with its full reasoning. You can see exactly WHY the ticket was classified as technical, WHY it was escalated, and WHAT response the AI drafted. This is timestamped, immutable, and compliance-ready.
>
> This isn't just logging -- this is accountability for AI decisions in enterprise processes."

**What to do:**
1. Show the run details / decision timeline
2. Click on an AI decision to show the reasoning

---

## Part 4: Key Differentiators (~1 min)

### Script

> "Let me highlight what makes AutoChain AI stand out:
>
> **1. Real AI Execution** -- Those weren't simulated responses. Every AI agent node actually calls the LLM in real-time. You saw the classification, response generation, and escalation decision -- all powered by Llama 3.3 70B.
>
> **2. Self-Healing Execution** -- If a node fails, the system retries with configurable backoff. If retries are exhausted, it follows fallback edges to recovery nodes. The Employee Onboarding template has built-in fallback paths for when background checks or IT provisioning fail.
>
> **3. Decision Audit Trail** -- Every AI decision is logged with reasoning, input, output, and timestamps. This is critical for compliance in regulated industries.
>
> **4. Human-in-the-Loop** -- AI handles the routine work, but humans stay in control for critical decisions. Approval gates can be placed anywhere in the workflow.
>
> **5. LLM-Agnostic** -- We use the Vercel AI SDK. Swap Groq for OpenAI, Claude, or local Ollama without changing any workflow. Just change one environment variable.
>
> **6. Visual & Accessible** -- The drag-and-drop builder means non-engineers can understand and modify workflows. No code required to automate complex processes."

---

## Part 5: Future Scope & Scalability (~1.5 min)

### Script

> "Before I close, let me talk about where AutoChain AI is headed and how the architecture scales for production.
>
> **Scalability Roadmap:**
>
> Right now, the execution engine runs synchronously inside the backend. For production scale, the architecture is designed to evolve into an event-driven system:
>
> **1. Message Queues & Workers** -- We'll add Apache Kafka or RabbitMQ as a message broker with dedicated Worker services. When a workflow is triggered, instead of executing inline, the backend publishes each node execution as a job to the queue. Separate Worker containers consume these jobs and execute them independently. This means you can run hundreds of workflows concurrently by simply scaling the number of Workers horizontally.
>
> **2. Outbox Pattern** -- A Processor service will read from an outbox table in PostgreSQL and reliably publish events to Kafka. This guarantees exactly-once delivery even if the system crashes mid-execution. No lost workflow runs.
>
> **3. Webhook Ingestion Service** -- A dedicated Hooks service on its own port will handle incoming webhooks from external systems -- Slack events, GitHub webhooks, Stripe notifications. This isolates webhook traffic from the main API and lets us scale ingestion independently.
>
> **4. MCP (Model Context Protocol) Integration** -- This is the big one. We plan to integrate Anthropic's Model Context Protocol, which lets AI agents connect to external tools and data sources through a standardized protocol. Instead of hardcoding each integration, MCP servers would expose tools like 'query database', 'search documents', 'call API' -- and our AI agents can discover and use them dynamically. This turns every workflow into a truly autonomous agent that can interact with any MCP-compatible system.
>
> **5. Redis Caching & Session Store** -- Add Redis for caching frequently accessed workflow definitions, AI model responses, and execution state. This reduces database load and speeds up repeated workflow runs.
>
> **6. Vector Database Memory** -- We already have the node types for Pinecone, Weaviate, and ChromaDB. In production, AI agents will have persistent memory across workflow runs -- they'll remember previous decisions, learn from past failures, and improve over time.
>
> **7. Distributed Execution** -- With Kafka + Workers, each node in a workflow can execute on a different machine. Parallel branches run on separate Workers simultaneously. A 10-node workflow that takes 30 seconds today could complete in under 5 seconds.
>
> **8. Observability** -- Prometheus metrics, Grafana dashboards, and structured logging for every execution. Combined with our existing audit trail, this gives operations teams full visibility into workflow health.
>
> The current architecture is intentionally simple for rapid development, but every component is designed to be swapped out for its distributed equivalent without changing the workflow definitions or frontend. Same drag-and-drop builder, same templates, same AI agents -- just running at enterprise scale."

---

## Part 6: Closing (~30 sec)

### Script

> "AutoChain AI transforms complex enterprise processes into visual, AI-powered workflows that execute autonomously, heal themselves when things go wrong, and maintain a complete audit trail of every AI decision.
>
> Built with Next.js, Express, PostgreSQL, and the Vercel AI SDK -- 30+ node types, pre-built templates, and a real execution engine that calls AI models in real-time. With a clear path to production scale through message queues, MCP integration, and distributed workers.
>
> Thank you."

---

## Alternative Demo: AI Workflow Generation (Bonus, ~1 min)

If you have extra time or want to show another feature:

**What to say:**
> "You can also generate workflows from natural language. Let me show you."

**What to do:**
1. Click "Create Workflow"
2. Select the AI generation option
3. Type: `"When a new customer signs up, validate their email format, enrich their profile with company data, score the lead quality from 0-100, and if the score is above 70, send a welcome email"`
4. Show the AI generating a complete workflow with nodes and connections
5. Show the pre-configured nodes on the canvas

---

## Troubleshooting During Demo

| Problem | Quick Fix |
|---------|-----------|
| Dashboard won't load | Check `docker compose ps`, restart with `docker compose down && docker compose up -d` |
| "Cannot connect to backend" | Wait 30 sec for backend to boot, check port 3001 |
| AI nodes return errors | Verify `AI_API_KEY` is set correctly in `primary-backend/.env` |
| No templates in library | Run `docker exec autochain-backend npx prisma db seed` |
| Nodes don't light up during execution | Refresh the page (WebSocket reconnects automatically) |
| Execution times out | Check Groq API key is valid, try a simpler test first |

---

## Tips for Judges

1. **Start with the problem** -- judges want to know WHY before HOW
2. **Emphasize the AI is real** -- stress that the LLM calls are happening live, not mocked
3. **Show the visual builder** -- the drag-and-drop canvas is immediately impressive
4. **Click into AI decisions** -- show the actual reasoning text the LLM returned
5. **Demo the approval gate** -- human-in-the-loop is a key differentiator for enterprise
6. **End with the audit trail** -- this is the compliance/enterprise selling point
7. **Keep it flowing** -- have the template pre-loaded and the JSON input ready to paste
8. **Mention self-healing** -- even if you don't demo a failure, explain the fallback edges
9. **Don't show config screens too long** -- focus on execution and results, not setup
