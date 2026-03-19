┌─────────────────────────────────────────────────────────────┐
│                    Workflow Engine                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Execution Engine                   │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐│  │
│  │  │ Trigger  │  │ Orchestr │  │  Tool    ││  │
│  │  │ Executor │  │  Executor │  │  Executor ││  │
│  │  └─────────┘  └─────────┘  └─────────┘│  │
│  └──────────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │      Connection & Credential Manager           │  │
│  │  - Encrypted Storage                         │  │
│  │  - RBAC                                     │  │
│  │  - Auto-refresh                               │  │
│  │  - Validation                                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 🔐 Connection & Credential System

The centralized credential layer provides secure management of all external integrations.

### Connection Schema

```typescript
{
  "connection_id": "slack_prod",
  "type": "slack",
  "auth_type": "oauth2 | api_key | basic | bearer",
  "credentials": {
    "api_key": "",
    "access_token": "",
    "refresh_token": "",
    "client_id": "",
    "client_secret": ""
  },
  "base_url": "",
  "headers": {},
  "expires_at": "",
  "scopes": [],
  "region": "us-east-1",
  "encryption": "AES256"
}
```

### Key Features

- **AES256 Encryption**: All credentials encrypted at rest
- **Role-Based Access Control**: Define who can use which connections
- **Auto Token Refresh**: Automatic OAuth token refresh before expiry
- **Environment Support**: Separate connections for dev/staging/prod
- **Connection Validation**: Test connections before use

### Creating a Connection

```typescript
import { getConnectionManager } from './connections/manager';

const connectionManager = getConnectionManager();

const connection = await connectionManager.createConnection({
  name: "Production Slack",
  type: "slack",
  auth_type: "oauth2",
  credentials: {
    access_token: "xoxb-xxxx",
    refresh_token: "xoxr-xxxx",
    client_id: "xxxx",
    client_secret: "xxxx"
  },
  environment: "prod",
  auto_refresh: true,
  refresh_threshold_minutes: 5,
  allowed_roles: ["admin", "developer"]
});
```

### Validating a Connection

```typescript
const validationResult = await connectionManager.validateConnection(
  "slack_prod",
  "connection"
);

if (validationResult.is_valid) {
  console.log(`Latency: ${validationResult.latency_ms}ms`);
} else {
  console.error(`Error: ${validationResult.message}`);
}
```

## 🧩 Node Types

Every node is a self-contained contract with inputs, auth, config, and execution rules.

### 1. 🎯 Trigger Nodes

#### Webhook Trigger
```typescript
{
  "node_id": "webhook_001",
  "node_type": "trigger.webhook",
  "trigger_type": "webhook",
  "endpoint_url": "https://api.yourapp.com/webhook/xyz",
  "method": "POST",
  "auth_required": true,
  "auth_token": "env.WEBHOOK_SECRET",
  "headers_expected": {
    "Content-Type": "application/json"
  },
  "retry_policy": {
    "retries": 3,
    "backoff": "exponential"
  }
}
```

#### Event Trigger (Slack/Teams/Zoom)
```typescript
{
  "node_id": "slack_event_001",
  "node_type": "trigger.event",
  "trigger_type": "event",
  "platform": "slack",
  "connection_id": "slack_prod",
  "event_type": "message.channels",
  "channel_id": "C12345",
  "verification_token": "env.SLACK_VERIFICATION"
}
```

#### Schedule Trigger
```typescript
{
  "node_id": "schedule_001",
  "node_type": "trigger.schedule",
  "trigger_type": "schedule",
  "cron_expression": "0 9 * * 1-5",
  "timezone": "America/New_York"
}
```

### 2. 🤖 Agent Nodes

AI-powered workflow execution with tool use and memory.

```typescript
{
  "node_id": "agent_001",
  "node_type": "agent",
  "agent_type": "planner",
  "goal": "Complete procurement process",
  "model_config": {
    "provider": "openai",
    "api_key": "env.OPENAI_API_KEY",
    "model": "gpt-4o",
    "temperature": 0.3
  },
  "tools_allowed": ["http_tool", "db_tool", "slack_tool"],
  "tool_connections": {
    "http_tool": "global_http",
    "slack_tool": "slack_prod"
  },
  "memory": {
    "type": "vector",
    "connection_id": "pinecone_prod",
    "embedding_api_key": "env.OPENAI_API_KEY"
  },
  "execution": {
    "max_iterations": 10,
    "timeout": 30000
  }
}
```

**Agent Types:**
- `planner`: Creates execution plans
- `executor`: Executes tools iteratively
- `analyzer`: Analyzes data and provides insights
- `recovery`: Handles errors and determines recovery strategies

### 3. 🔧 Tool Nodes

#### HTTP API Call Node
```typescript
{
  "node_id": "http_001",
  "node_type": "tool.http",
  "connection_id": "stripe_prod",
  "method": "POST",
  "url": "/v1/payment_intents",
  "headers": {
    "Authorization": "Bearer {{connection.api_key}}"
  },
  "body": {
    "amount": "{{input.amount}}",
    "currency": "usd"
  },
  "timeout": 10000,
  "validation": {
    "status_code": 200
  }
}
```

#### Database Node
```typescript
{
  "node_id": "db_001",
  "node_type": "tool.database",
  "connection_id": "postgres_prod",
  "db_type": "postgres",
  "operation": "select",
  "query": "SELECT * FROM orders WHERE id = {{input.order_id}}",
  "parameters": {
    "order_id": "{{input.order_id}}"
  },
  "ssl": true
}
```

#### Email Node
```typescript
{
  "node_id": "email_001",
  "node_type": "tool.email",
  "provider": "sendgrid",
  "connection_id": "sendgrid_prod",
  "api_key": "env.SENDGRID_API_KEY",
  "from": "noreply@company.com",
  "to": "{{input.email}}",
  "subject": "Order Update",
  "body": "Your order is processed",
  "body_type": "html",
  "tracking": {
    "opens": true,
    "clicks": true
  }
}
```

#### Slack/Teams Node
```typescript
{
  "node_id": "slack_001",
  "node_type": "tool.slack",
  "connection_id": "slack_prod",
  "channel": "#alerts",
  "message": "Workflow failed at step {{node_id}}",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Error Details:*"
      }
    }
  ]
}
```

#### Browser Automation (Playwright)
```typescript
{
  "node_id": "browser_001",
  "node_type": "tool.browser",
  "engine": "playwright",
  "url": "https://portal.vendor.com",
  "actions": [
    {
      "type": "click",
      "selector": "#login"
    },
    {
      "type": "type",
      "selector": "#username",
      "value": "{{env.USER}}"
    },
    {
      "type": "type",
      "selector": "#password",
      "value": "{{env.PASS}}"
    }
  ],
  "headless": true,
  "timeout": 20000,
  "screenshot": true
}
```

### 4. 🔄 Orchestrator Nodes

#### Conditional Node
```typescript
{
  "node_id": "conditional_001",
  "node_type": "orchestrator.conditional",
  "condition": "{{input.amount}} > 10000",
  "evaluation_mode": "js",
  "ai_config": {
    "api_key": "env.OPENAI_API_KEY",
    "model": "gpt-4o"
  },
  "true_branch": "manager_approval",
  "false_branch": "auto_process"
}
```

#### Parallel Node
```typescript
{
  "node_id": "parallel_001",
  "node_type": "orchestrator.parallel",
  "branches": ["process_a", "process_b", "process_c"],
  "wait_for_all": true,
  "max_concurrency": 5,
  "on_error": "stop_all"
}
```

#### Loop Node
```typescript
{
  "node_id": "loop_001",
  "node_type": "orchestrator.loop",
  "loop_type": "foreach",
  "loop_over": "input.items",
  "max_iterations": 100,
  "body_node": "process_item",
  "collect_results": true
}
```

#### Switch Node
```typescript
{
  "node_id": "switch_001",
  "node_type": "orchestrator.switch",
  "value_expression": "{{input.priority}}",
  "cases": [
    {
      "condition": "high",
      "branch": "urgent_handler"
    },
    {
      "condition": "medium",
      "branch": "normal_handler"
    }
  ],
  "default_branch": "default_handler"
}
```

### 5. ✅ Validation Node

```typescript
{
  "node_id": "validation_001",
  "node_type": "validation",
  "validation_type": "ai",
  "model_config": {
    "api_key": "env.OPENAI_API_KEY",
    "model": "gpt-4o"
  },
  "rules": "Check if invoice data is valid and complete",
  "confidence_threshold": 0.85,
  "on_fail": "retry_or_escalate",
  "fallback_node": "manual_review"
}
```

**Validation Types:**
- `schema`: JSON schema validation
- `ai`: AI-powered validation
- `business_rule`: Custom business rule evaluation
- `custom`: Custom validation logic

### 6. 🚨 Error Handling Node

```typescript
{
  "node_id": "error_handler_001",
  "node_type": "error_handling",
  "error_type": "api_failure",
  "retry_policy": {
    "retries": 5,
    "backoff": "exponential"
  },
  "fallback": {
    "type": "agent",
    "agent_id": "recovery_agent"
  },
  "alert": {
    "enabled": true,
    "type": "slack",
    "connection_id": "slack_prod",
    "channel": "#critical-alerts"
  }
}
```

### 7. 📊 Workflow Monitor Node

```typescript
{
  "node_id": "monitor_001",
  "node_type": "monitor.workflow",
  "sla": {
    "max_duration_ms": 60000
  },
  "metrics": ["latency", "error_rate", "cost"],
  "alerting": {
    "enabled": true,
    "slack_connection_id": "slack_prod",
    "slack_channel": "#ops-alerts"
  },
  "prediction": {
    "enabled": true,
    "model_api_key": "env.OPENAI_API_KEY"
  }
}
```

### 8. 📝 Audit Log Node

```typescript
{
  "node_id": "audit_001",
  "node_type": "audit.log",
  "log_level": "full",
  "storage": {
    "type": "s3",
    "bucket": "workflow-logs",
    "access_key": "env.AWS_KEY",
    "secret_key": "env.AWS_SECRET"
  },
  "include": [
    "inputs",
    "outputs",
    "agent_decisions",
    "tool_calls"
  ],
  "anonymize": true,
  "retention_days": 90,
  "compression": true
}
```

**Log Levels:**
- `minimal`: Summary only
- `standard`: Inputs, outputs, errors
- `full`: All execution details
- `debug`: Full + debug information

### 9. 🧠 Memory Node

```typescript
{
  "node_id": "memory_001",
  "node_type": "memory",
  "memory_type": "vector",
  "operation": "store",
  "provider": "pinecone",
  "connection_id": "pinecone_prod",
  "api_key": "env.PINECONE_API_KEY",
  "environment": "us-west1",
  "index": "workflow-memory",
  "embedding_model": "text-embedding-3-large",
  "data": {
    "text": "Important workflow context",
    "metadata": {
      "workflow_id": "{{workflow_id}}",
      "execution_id": "{{execution_id}}"
    }
  }
}
```

**Supported Providers:**
- `pinecone`
- `weaviate`
- `chromadb`
- `milvus`
- `redis`
- `custom`

### 10. 👤 Human Approval Node

```typescript
{
  "node_id": "approval_001",
  "node_type": "human.approval",
  "assigned_to": "manager@company.com",
  "ui_form": {
    "title": "Expense Approval",
    "description": "Please review this expense report",
    "fields": [
      {
        "name": "approve",
        "type": "radio",
        "label": "Decision",
        "required": true,
        "options": ["approve", "reject", "request_changes"]
      },
      {
        "name": "comments",
        "type": "textarea",
        "label": "Comments",
        "required": false
      }
    ]
  },
  "context": {
    "amount": "{{input.amount}}",
    "description": "{{input.description}}"
  },
  "timeout": 86400,
  "fallback": "auto_reject",
  "notification": {
    "enabled": true,
    "slack_connection_id": "slack_prod",
    "channel": "#approvals",
    "email": true
  }
}
```

### 11. 🎥 Meeting Intelligence Node

```typescript
{
  "node_id": "meeting_001",
  "node_type": "meeting.intelligence",
  "input_source": "zoom",
  "zoom_api_key": "env.ZOOM_API_KEY",
  "transcription_model": "whisper",
  "llm_api_key": "env.OPENAI_API_KEY",
  "llm_model": "gpt-4o",
  "task_extraction": true,
  "summary_generation": true,
  "action_item_detection": true,
  "sentiment_analysis": true,
  "output_integrations": {
    "jira": {
      "connection_id": "jira_prod",
      "project_key": "PROJ"
    },
    "notion": {
      "connection_id": "notion_prod",
      "database_id": "database_id"
    },
    "slack": {
      "connection_id": "slack_prod",
      "channel": "#meeting-tasks"
    }
  }
}
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

Set up your environment variables:

```bash
# Encryption
ENCRYPTION_MASTER_KEY=your-secret-master-key

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# External Services
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
STRIPE_API_KEY=sk_live_...
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...

# Database
DATABASE_URL=postgresql://...
```

### Create Your First Workflow

```typescript
import { createWorkflow } from './workflows/manager';
import { NodeExecutorFactory } from './execution/factory';

// Define workflow
const workflow = {
  workflow_id: "procurement_workflow",
  name: "Procurement Process",
  nodes: [
    {
      node_id: "trigger_1",
      node_type: "trigger.webhook",
      endpoint_url: "/webhook/procurement",
      method: "POST"
    },
    {
      node_id: "agent_1",
      node_type: "agent",
      agent_type: "planner",
      goal: "Plan procurement approval workflow",
      model_config: {
        provider: "openai",
        api_key: "env.OPENAI_API_KEY",
        model: "gpt-4o"
      }
    },
    {
      node_id: "http_1",
      node_type: "tool.http",
      connection_id: "stripe_prod",
      method: "POST",
      url: "/v1/payment_intents"
    }
  ],
  edges: [
    {
      id: "edge_1",
      source_node_id: "trigger_1",
      target_node_id: "agent_1"
    },
    {
      id: "edge_2",
      source_node_id: "agent_1",
      target_node_id: "http_1"
    }
  ],
  start_node_id: "trigger_1"
};

// Create workflow
await createWorkflow(workflow);
```

## 📖 Usage Examples

### Example 1: E-commerce Order Processing

```typescript
{
  "workflow_id": "order_processing",
  "name": "E-commerce Order Processing",
  "nodes": [
    // Trigger on new order
    {
      "node_id": "webhook_order",
      "node_type": "trigger.webhook",
      "endpoint_url": "/webhook/orders",
      "method": "POST",
      "auth_required": true,
      "auth_token": "env.WEBHOOK_SECRET"
    },
    // Validate order data
    {
      "node_id": "validate_order",
      "node_type": "validation",
      "validation_type": "schema",
      "rules": {
        "required": ["order_id", "amount", "customer_email", "items"]
      },
      "on_fail": "stop"
    },
    // Check if high value order
    {
      "node_id": "check_value",
      "node_type": "orchestrator.conditional",
      "condition": "{{input.amount}} > 1000",
      "true_branch": "high_value_approval",
      "false_branch": "process_order"
    },
    // Human approval for high value
    {
      "node_id": "high_value_approval",
      "node_type": "human.approval",
      "assigned_to": "finance@company.com",
      "ui_form": {
        "title": "High Value Order Approval",
        "description": "Order amount exceeds $1000",
        "fields": [
          {
            "name": "decision",
            "type": "radio",
            "label": "Approve?",
            "options": ["approve", "reject"]
          },
          {
            "name": "comments",
            "type": "textarea",
            "label": "Comments"
          }
        ]
      },
      "timeout": 3600,
      "fallback": "reject"
    },
    // Process payment
    {
      "node_id": "process_payment",
      "node_type": "tool.http",
      "connection_id": "stripe_prod",
      "method": "POST",
      "url": "/v1/payment_intents",
      "body": {
        "amount": "{{input.amount}}",
        "currency": "usd",
        "customer": "{{prev.webhook_order.customer_email}}"
      }
    },
    // Send confirmation email
    {
      "node_id": "send_email",
      "node_type": "tool.email",
      "provider": "sendgrid",
      "connection_id": "sendgrid_prod",
      "from": "orders@company.com",
      "to": "{{prev.webhook_order.customer_email}}",
      "subject": "Order Confirmation",
      "body": "Your order has been processed"
    },
    // Log execution
    {
      "node_id": "audit_log",
      "node_type": "audit.log",
      "log_level": "full",
      "storage": {
        "type": "s3",
        "bucket": "order-logs"
      }
    }
  ],
  "edges": [
    { "source": "webhook_order", "target": "validate_order" },
    { "source": "validate_order", "target": "check_value" },
    { "source": "check_value", "target": "high_value_approval", "condition": "true" },
    { "source": "check_value", "target": "process_order", "condition": "false" },
    { "source": "high_value_approval", "target": "process_payment" },
    { "source": "process_payment", "target": "send_email" },
    { "source": "send_email", "target": "audit_log" }
  ]
}
```

### Example 2: AI-Powered Document Analysis

```typescript
{
  "workflow_id": "document_analysis",
  "name": "Document Analysis with AI",
  "nodes": [
    // Upload trigger
    {
      "node_id": "upload_trigger",
      "node_type": "trigger.webhook",
      "endpoint_url": "/webhook/documents",
      "method": "POST"
    },
    // Agent analyzes document
    {
      "node_id": "analysis_agent",
      "node_type": "agent",
      "agent_type": "analyzer",
      "goal": "Analyze uploaded document and extract key information",
      "model_config": {
        "provider": "openai",
        "api_key": "env.OPENAI_API_KEY",
        "model": "gpt-4o",
        "temperature": 0.2
      },
      "tools_allowed": ["vision_tool"],
      "tool_connections": {
        "vision_tool": "openai_prod"
      },
      "memory": {
        "type": "vector",
        "connection_id": "pinecone_prod",
        "embedding_api_key": "env.OPENAI_API_KEY"
      }
    },
    // Validate extraction
    {
      "node_id": "validate_extraction",
      "node_type": "validation",
      "validation_type": "ai",
      "rules": "Verify all required fields are extracted",
      "ai_config": {
        "api_key": "env.OPENAI_API_KEY",
        "model": "gpt-4o"
      },
      "confidence_threshold": 0.9,
      "on_fail": "fallback"
    },
    // Store in database
    {
      "node_id": "store_data",
      "node_type": "tool.database",
      "connection_id": "postgres_prod",
      "db_type": "postgres",
      "operation": "insert",
      "table": "documents",
      "data": {
        "content": "{{prev.analysis_agent.output}}",
        "metadata": "{{prev.analysis_agent.metadata}}"
      }
    },
    // Send notification
    {
      "node_id": "notify_team",
      "node_type": "tool.slack",
      "connection_id": "slack_prod",
      "channel": "#document-uploads",
      "message": "New document analyzed: {{prev.analysis_agent.summary}}"
    }
  ],
  "edges": [
    { "source": "upload_trigger", "target": "analysis_agent" },
    { "source": "analysis_agent", "target": "validate_extraction" },
    { "source": "validate_extraction", "target": "store_data" },
    { "source": "store_data", "target": "notify_team" }
  ]
}
```

### Example 3: Meeting Intelligence Workflow

```typescript
{
  "workflow_id": "meeting_intelligence",
  "name": "Meeting to Task Conversion",
  "nodes": [
    // Trigger on Zoom recording
    {
      "node_id": "zoom_trigger",
      "node_type": "trigger.event",
      "platform": "zoom",
      "connection_id": "zoom_prod",
      "event_type": "recording.completed",
      "meeting_id": "{{input.meeting_id}}"
    },
    // Transcribe and analyze
    {
      "node_id": "meeting_analysis",
      "node_type": "meeting.intelligence",
      "input_source": "zoom",
      "zoom_api_key": "env.ZOOM_API_KEY",
      "transcription_model": "whisper",
      "llm_api_key": "env.OPENAI_API_KEY",
      "llm_model": "gpt-4o",
      "task_extraction": true,
      "summary_generation": true,
      "action_item_detection": true,
      "sentiment_analysis": true,
      "output_integrations": {
        "jira": {
          "connection_id": "jira_prod",
          "project_key": "MEET"
        },
        "notion": {
          "connection_id": "notion_prod",
          "database_id": "meeting_notes"
        },
        "slack": {
          "connection_id": "slack_prod",
          "channel": "#meeting-tasks"
        }
      }
    },
    // Monitor performance
    {
      "node_id": "monitor",
      "node_type": "monitor.workflow",
      "sla": {
        "max_duration_ms": 120000
      },
      "metrics": ["latency", "cost", "throughput"],
      "alerting": {
        "enabled": true,
        "slack_connection_id": "slack_prod",
        "slack_channel": "#ops-alerts"
      }
    },
    // Audit log
    {
      "node_id": "audit",
      "node_type": "audit.log",
      "log_level": "full",
      "storage": {
        "type": "s3",
        "bucket": "meeting-logs"
      },
      "include": [
        "inputs",
        "outputs",
        "agent_decisions",
        "tool_calls"
      ]
    }
  ],
  "edges": [
    { "source": "zoom_trigger", "target": "meeting_analysis" },
    { "source": "meeting_analysis", "target": "monitor" },
    { "source": "monitor", "target": "audit" }
  ]
}
```

## ⚙️ Configuration

### Environment Variables

```bash
# Core
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Encryption
ENCRYPTION_MASTER_KEY=your-32-char-min-key
SECRET_KEY=additional-secret

# AI Services
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Integrations
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET=workflow-storage

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
DATADOG_API_KEY=xxxxx
```

### Workflow Configuration

```typescript
// config/workflows.ts
export const workflowConfig = {
  defaultTimeout: 300000, // 5 minutes
  maxRetries: 3,
  retryBackoff: 'exponential',
  enableMonitoring: true,
  enableAuditLogging: true,
  alertOnFailure: true,
  slaDurationMs: 60000, // 1 minute
};
```

## 🔌 API Reference

### Connection Manager API

```typescript
import { getConnectionManager } from './connections/manager';

const manager = getConnectionManager();

// Create connection
await manager.createConnection({
  name: "My Connection",
  type: "slack",
  auth_type: "oauth2",
  credentials: { /* ... */ },
  environment: "prod",
  auto_refresh: true
});

// Get connection (decrypted)
const connection = await manager.getConnection('connection_id');

// Validate connection
const validation = await manager.validateConnection('connection_id');

// Check permissions
const hasAccess = manager.hasPermission(
  'connection_id',
  'user_id',
  'developer'
);
```

### Execution Engine API

```typescript
import { NodeExecutorFactory } from './execution/factory';

// Execute a single node
const result = await NodeExecutorFactory.executeNode(node, context);

// Execute multiple nodes in parallel
const results = await NodeExecutorFactory.batchExecute([
  { node: node1, context: ctx1 },
  { node: node2, context: ctx2 }
]);

// Get executor statistics
const stats = NodeExecutorFactory.getStatistics();
```

### Workflow Management API

```typescript
import { WorkflowManager } from './workflows/manager';

const workflowManager = new WorkflowManager();

// Create workflow
const workflow = await workflowManager.createWorkflow({
  name: "My Workflow",
  nodes: [ /* ... */],
  edges: [ /* ... */],
  start_node_id: "trigger_1"
});

// Execute workflow
const execution = await workflowManager.executeWorkflow(
  'workflow_id',
  {
    input_data: { /* ... */ },
    triggered_by: 'user@company.com'
  }
);

// Get workflow statistics
const stats = await workflowManager.getWorkflowStats('workflow_id');
```

## 📚 Best Practices

### Security

1. **Always use encrypted connections**
   ```typescript
   // Good
   const connection = await connectionManager.createConnection({
     credentials: { /* encrypted automatically */ }
   });
   ```

2. **Implement RBAC properly**
   ```typescript
   await connectionManager.createConnection({
     allowed_roles: ["admin", "developer"],
     allowed_users: ["specific@user.com"]
   });
   ```

3. **Use environment variables for secrets**
   ```typescript
   model_config: {
     api_key: "env.OPENAI_API_KEY" // Never hardcode!
   }
   ```

### Performance

1. **Set appropriate timeouts**
   - Webhooks: 30 seconds
   - HTTP calls: 10-30 seconds
   - Database queries: 5 seconds
   - Agent execution: 30-60 seconds

2. **Use parallel execution when safe**
   ```typescript
   {
     "node_type": "orchestrator.parallel",
     "max_concurrency": 5,
     "wait_for_all": true
   }
   ```

3. **Implement proper retry logic**
   ```typescript
   "retry_policy": {
     "retries": 3,
     "backoff": "exponential",
     "initial_delay_ms": 1000,
     "max_delay_ms": 30000
   }
   ```

### Monitoring

1. **Always include audit logging**
   ```typescript
   {
     "node_type": "audit.log",
     "log_level": "full",
     "storage": {
       "type": "s3",
       "bucket": "workflow-logs"
     }
   }
   ```

2. **Set SLA thresholds**
   ```typescript
   {
     "node_type": "monitor.workflow",
     "sla": {
       "max_duration_ms": 60000,
       "warning_threshold_ms": 45000
     }
   }
   ```

3. **Enable predictions**
   ```typescript
   {
     "prediction": {
       "enabled": true,
       "model_api_key": "env.OPENAI_API_KEY",
       "prediction_types": ["latency", "errors", "cost"]
     }
   }
   ```

### Error Handling

1. **Implement fallback strategies**
   ```typescript
   {
     "node_type": "error_handling",
     "fallback": {
       "type": "agent",
       "agent_id": "recovery_agent"
     }
   }
   ```

2. **Configure appropriate alerts**
   ```typescript
   {
     "alert": {
       "enabled": true,
       "type": "slack",
       "connection_id": "slack_prod",
       "channel": "#critical-alerts"
     }
   }
   ```

3. **Use human approval for critical decisions**
   ```typescript
   {
     "node_type": "human.approval",
     "assigned_to": "manager@company.com",
     "timeout": 86400,
     "fallback": "auto_reject"
   }
   ```

## 🔍 Troubleshooting

### Connection Issues

**Problem**: Connection validation fails

```typescript
// Check connection status
const validation = await connectionManager.validateConnection('conn_id');
console.log(validation.message);

// Check encryption
const conn = await connectionManager.getConnection('conn_id');
console.log('Encryption:', conn.encryption);

// Check credentials
console.log('Auth type:', conn.auth_type);
console.log('Has refresh token:', !!conn.credentials.refresh_token);
```

### Workflow Execution Issues

**Problem**: Workflow stuck or slow

```typescript
// Check execution status
const execution = await workflowManager.getExecution('execution_id');
console.log('Status:', execution.status);
console.log('Current node:', execution.current_node_id);
console.log('Failed nodes:', execution.failed_nodes);

// Check metrics
const monitor = new WorkflowMonitorNodeExecutor();
const metrics = await monitor.collectMetrics(['latency', 'error_rate'], context);
console.log('Metrics:', metrics);
```

### Memory Issues

**Problem**: Vector search returning poor results

```typescript
// Check embeddings
const memory = new MemoryNodeExecutor();
const result = await memory.executeNode(memoryNode, context);
console.log('Search results:', result.result.matches);

// Verify embedding quality
const embedding = await generateEmbedding('test text', 'text-embedding-3-large');
console.log('Embedding dimension:', embedding.length);

// Check index configuration
const pinecone = await getPineconeIndex(pineconeClient, 'my-index');
console.log('Index dimension:', 1536);
console.log('Index metric:', 'cosine');
```

## 📊 Metrics and Monitoring

### Available Metrics

- **latency**: Execution time analysis
- **error_rate**: Error frequency and types
- **cost**: Execution cost estimation
- **throughput**: Workflow execution rate
- **success_rate**: Percentage of successful executions

### Health Score Calculation

```typescript
{
  score: 85, // 0-100
  status: 'healthy', // healthy | warning | critical
  factors: {
    success_rate: 95,
    error_rate: 0.95,
    latency: 80
  }
}
```

### Alert Thresholds

- **SLA Violations**: Duration exceeds threshold
- **Health Score Degradation**: Score < 70
- **High Error Rate**: Error rate > 10%
- **Predicted Anomalies**: AI-detected issues

## 🤝 Contributing

### Adding a New Node Type

1. Create the node schema in `types/nodes.ts`
2. Create the executor class extending `BaseNodeExecutor`
3. Register the executor in `execution/factory.ts`

```typescript
// 1. Define schema
export const CustomNodeSchema = BaseNodeSchema.extend({
  node_type: z.literal("custom.mytype"),
  /* ... custom fields */
});

// 2. Create executor
export class CustomNodeExecutor extends BaseNodeExecutor {
  protected async executeNode(node, context) {
    // Your implementation
    return { /* result */ };
  }
}

// 3. Register factory
NodeExecutorFactory.registerExecutor('custom.mytype', CustomNodeExecutor);
```

## 📄 License

Copyright © 2024 Enterprise Workflow Automation

## 🆘 Support

For issues and questions, please refer to the project documentation or contact the development team.