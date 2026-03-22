import { BaseNodeExecutor } from "../../execution/base-executor";
import { AgentNode, NodeExecutionContext } from "../../types/nodes";
import { getConnectionManager } from "../../connections/manager";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import axios from "axios";

/**
 * Agent Node Executor
 * Handles AI-powered workflow steps with planning, tool use, and memory capabilities
 */
export class AgentNodeExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: AgentNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, [
      "agent_type",
      "goal",
      "model_config",
      "tools_allowed",
    ]);

    // Initialize AI model client
    const modelClient = this.initializeModelClient(node.model_config);

    // Initialize tools
    const tools = await this.initializeTools(node, context);

    // Initialize memory if configured
    const memoryStore = node.memory
      ? await this.initializeMemory(node.memory, context)
      : null;

    // Initialize knowledge base if configured
    const knowledgeBase = node.knowledge_base?.enabled
      ? await this.initializeKnowledgeBase(node, context)
      : null;

    // Execute agent based on type
    const result = await this.executeAgent(
      node,
      context,
      modelClient,
      tools,
      memoryStore,
      knowledgeBase,
    );

    return {
      agent_type: node.agent_type,
      goal: node.goal,
      result: result.output,
      reasoning: result.reasoning,
      tool_calls: result.tool_calls,
      iterations: result.iterations,
      execution_time_ms: result.execution_time_ms,
      memory_used: result.memory_used,
      knowledge_accessed: result.knowledge_accessed,
      decisions: result.decisions,
      confidence: result.confidence,
      metadata: {
        model: node.model_config.model,
        provider: node.model_config.provider,
        tools_used: result.tools_used,
      },
    };
  }

  /**
   * Initialize AI model provider using Vercel AI SDK's createOpenAI.
   * Works with any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter, Ollama, etc.).
   */
  private initializeModelClient(modelConfig: any): any {
    const provider = modelConfig.provider || "custom";

    switch (provider) {
      case "openai":
        return createOpenAI({
          apiKey: this.resolveApiKey(modelConfig.api_key),
          compatibility: "compatible",
        });

      case "anthropic":
        return createOpenAI({
          apiKey: this.resolveApiKey(modelConfig.api_key),
          baseURL: "https://api.anthropic.com/v1",
          compatibility: "compatible",
        });

      case "google":
        return createOpenAI({
          apiKey: this.resolveApiKey(modelConfig.api_key),
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          compatibility: "compatible",
        });

      case "azure":
        return createOpenAI({
          apiKey: this.resolveApiKey(modelConfig.api_key),
          baseURL: modelConfig.endpoint,
          compatibility: "compatible",
        });

      case "openrouter":
        return createOpenAI({
          apiKey: this.resolveApiKey(modelConfig.api_key),
          baseURL: "https://openrouter.ai/api/v1",
          compatibility: "compatible",
        });

      case "groq":
        return createOpenAI({
          apiKey: this.resolveApiKey(modelConfig.api_key),
          baseURL: "https://api.groq.com/openai/v1",
          compatibility: "compatible",
        });

      case "local":
        return createOpenAI({
          apiKey: "ollama",
          baseURL: modelConfig.baseURL || "http://localhost:11434/v1",
          compatibility: "compatible",
        });

      case "custom":
      default: {
        const apiKey =
          modelConfig.api_key
            ? this.resolveApiKey(modelConfig.api_key)
            : process.env.AI_API_KEY ||
              process.env.GROQ_API_KEY ||
              process.env.OPENROUTER_API_KEY;

        const baseURL =
          modelConfig.baseURL ||
          process.env.AI_BASE_URL ||
          (process.env.GROQ_API_KEY
            ? "https://api.groq.com/openai/v1"
            : "https://openrouter.ai/api/v1");

        if (!apiKey) {
          throw new Error("No AI API key configured");
        }

        return createOpenAI({
          apiKey,
          baseURL,
          compatibility: "compatible",
        });
      }
    }
  }

  /**
   * Resolve API key from template or environment
   */
  private resolveApiKey(apiKeyTemplate: string): string {
    if (apiKeyTemplate.startsWith("env.")) {
      const envVar = apiKeyTemplate.substring(4);
      const key = process.env[envVar];
      if (!key) {
        throw new Error(`Environment variable ${envVar} not found`);
      }
      return key;
    }
    return apiKeyTemplate;
  }

  /**
   * Initialize tools for the agent
   */
  private async initializeTools(
    node: AgentNode,
    context: NodeExecutionContext,
  ): Promise<Map<string, any>> {
    const tools = new Map<string, any>();
    const connectionManager = getConnectionManager();

    for (const toolName of node.tools_allowed) {
      const connectionId = node.tool_connections[toolName];

      if (!connectionId) {
        throw new Error(`No connection configured for tool: ${toolName}`);
      }

      const connection = await connectionManager.getConnectionForExecution(
        connectionId,
        context.user_context?.user_id || "system",
        (context.user_context?.role as any) || "admin",
      );

      if (!connection) {
        throw new Error(`Connection not found for tool: ${toolName}`);
      }

      // Initialize tool wrapper
      const toolWrapper = this.createToolWrapper(
        toolName,
        connection,
        node.model_config,
      );
      tools.set(toolName, toolWrapper);
    }

    return tools;
  }

  /**
   * Create wrapper for tool execution
   */
  private createToolWrapper(
    toolName: string,
    connection: any,
    modelConfig: any,
  ): any {
    return {
      name: toolName,
      connection,
      execute: async (params: any) => {
        return await this.executeTool(toolName, connection, params);
      },
      getSchema: () => this.getToolSchema(toolName),
    };
  }

  /**
   * Execute tool with connection
   */
  private async executeTool(
    toolName: string,
    connection: any,
    params: any,
  ): Promise<any> {
    switch (connection.type) {
      case "http":
      case "slack":
      case "stripe":
        return await this.executeHttpTool(connection, params);

      case "postgres":
      case "mysql":
        return await this.executeDatabaseTool(connection, params);

      case "openai":
        return await this.executeAITool(connection, params);

      default:
        throw new Error(`Unsupported tool type: ${connection.type}`);
    }
  }

  /**
   * Execute HTTP-based tool
   */
  private async executeHttpTool(connection: any, params: any): Promise<any> {
    const { url, method, headers, body, query_params } = params;

    const axiosConfig: any = {
      method,
      url: connection.base_url + url,
      headers: {
        ...(connection.headers || {}),
        ...headers,
      },
      params: query_params,
      data: body,
      timeout: 30000,
    };

    // Add authentication
    if (connection.credentials?.api_key) {
      axiosConfig.headers["Authorization"] =
        `Bearer ${connection.credentials.api_key}`;
    }

    const response = await axios(axiosConfig);
    return response.data;
  }

  /**
   * Execute database tool
   */
  private async executeDatabaseTool(
    connection: any,
    params: any,
  ): Promise<any> {
    // Implement database tool execution
    // This would use pg, mysql2, or similar libraries
    const { query, parameters } = params;

    // Placeholder implementation
    return {
      query,
      parameters,
      results: [], // Actual query results would go here
      affected_rows: 0,
    };
  }

  /**
   * Execute AI tool using Vercel AI SDK
   */
  private async executeAITool(connection: any, params: any): Promise<any> {
    const provider = createOpenAI({
      apiKey: connection.credentials.api_key,
      compatibility: "compatible",
    });

    const result = await generateText({
      model: provider("gpt-4"),
      messages: params.messages || [],
      temperature: params.temperature || 0.7,
    });

    return {
      role: "assistant",
      content: result.text,
    };
  }

  /**
   * Get tool schema for agent
   */
  private getToolSchema(toolName: string): any {
    const schemas: Record<string, any> = {
      http_tool: {
        type: "function",
        function: {
          name: "http_tool",
          description: "Make HTTP requests to external APIs",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "Endpoint URL path" },
              method: {
                type: "string",
                enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
                description: "HTTP method",
              },
              headers: { type: "object", description: "Request headers" },
              body: { type: "object", description: "Request body" },
              query_params: { type: "object", description: "Query parameters" },
            },
            required: ["url", "method"],
          },
        },
      },
      db_tool: {
        type: "function",
        function: {
          name: "db_tool",
          description: "Execute database queries",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "SQL query" },
              parameters: { type: "array", description: "Query parameters" },
            },
            required: ["query"],
          },
        },
      },
      slack_tool: {
        type: "function",
        function: {
          name: "slack_tool",
          description: "Send messages to Slack",
          parameters: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID or name" },
              message: { type: "string", description: "Message text" },
              blocks: { type: "array", description: "Slack blocks" },
            },
            required: ["channel", "message"],
          },
        },
      },
      ai_tool: {
        type: "function",
        function: {
          name: "ai_tool",
          description: "Use AI for analysis or generation",
          parameters: {
            type: "object",
            properties: {
              messages: {
                type: "array",
                description: "Array of message objects with role and content",
                items: {
                  type: "object",
                  properties: {
                    role: {
                      type: "string",
                      enum: ["system", "user", "assistant"],
                    },
                    content: { type: "string" },
                  },
                  required: ["role", "content"],
                },
              },
              temperature: {
                type: "number",
                description: "Sampling temperature",
              },
            },
            required: ["messages"],
          },
        },
      },
    };

    return schemas[toolName] || null;
  }

  /**
   * Initialize memory system
   */
  private async initializeMemory(
    memoryConfig: any,
    context: NodeExecutionContext,
  ): Promise<any> {
    // Implement memory initialization
    // This would connect to vector DBs like Pinecone, Weaviate, etc.
    return {
      type: memoryConfig.type,
      store: async (data: any) => {
        // Store data in memory
        return true;
      },
      retrieve: async (query: any) => {
        // Retrieve data from memory
        return [];
      },
      search: async (query: string, limit: number = 5) => {
        // Semantic search in memory
        return [];
      },
    };
  }

  /**
   * Initialize knowledge base
   */
  private async initializeKnowledgeBase(
    node: AgentNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    // Implement knowledge base initialization
    // This would load documents and prepare them for retrieval
    return {
      documents: node.knowledge_base?.documents || [],
      search: async (query: string) => {
        // Search in knowledge base
        return [];
      },
    };
  }

  /**
   * Execute agent based on type
   */
  private async executeAgent(
    node: AgentNode,
    context: NodeExecutionContext,
    modelClient: any,
    tools: Map<string, any>,
    memoryStore: any,
    knowledgeBase: any,
  ): Promise<any> {
    const startTime = Date.now();
    const maxIterations = node.execution?.max_iterations || 10;
    const timeout = node.execution?.timeout || 30000;

    switch (node.agent_type) {
      case "planner":
        return await this.executePlannerAgent(
          node,
          context,
          modelClient,
          tools,
          maxIterations,
        );

      case "executor":
        return await this.executeExecutorAgent(
          node,
          context,
          modelClient,
          tools,
          maxIterations,
        );

      case "analyzer":
        return await this.executeAnalyzerAgent(
          node,
          context,
          modelClient,
          memoryStore,
          knowledgeBase,
        );

      case "recovery":
        return await this.executeRecoveryAgent(
          node,
          context,
          modelClient,
          tools,
        );

      default:
        throw new Error(`Unknown agent type: ${node.agent_type}`);
    }
  }

  /**
   * Execute planner agent - creates execution plans
   */
  private async executePlannerAgent(
    node: AgentNode,
    context: NodeExecutionContext,
    modelClient: any,
    tools: Map<string, any>,
    maxIterations: number,
  ): Promise<any> {
    const systemPrompt = `You are a planning agent. Your goal is to create a detailed execution plan for the following task:

Goal: ${node.goal}

Available tools: ${Array.from(tools.keys()).join(", ")}

Instructions: ${node.instructions || "Create a step-by-step plan to accomplish the goal."}

Analyze the task, break it down into steps, and determine which tools to use for each step. Be specific and detailed.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: `Input data: ${JSON.stringify(context.input_data, null, 2)}`,
      },
    ];

    const text = await this.callModel(
      modelClient,
      messages,
      node.model_config,
    );

    return {
      output: text,
      reasoning: "",
      tool_calls: [],
      iterations: 1,
      execution_time_ms: 0,
      memory_used: false,
      knowledge_accessed: false,
      decisions: [
        {
          type: "plan_created",
          details: "Execution plan created successfully",
        },
      ],
      confidence: 0.85,
      tools_used: [],
    };
  }

  /**
   * Execute executor agent - executes tools iteratively
   */
  private async executeExecutorAgent(
    node: AgentNode,
    context: NodeExecutionContext,
    modelClient: any,
    tools: Map<string, any>,
    maxIterations: number,
  ): Promise<any> {
    const systemPrompt = `You are an execution agent. Your goal is to accomplish the following task by using available tools:

Goal: ${node.goal}

Instructions: ${node.instructions || "Use the available tools to accomplish the goal. Think step by step."}

Available tools: ${this.getToolDescriptions(tools)}

For each step, decide which tool to use and provide the parameters. Continue until the goal is accomplished.`;

    let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Input data: ${JSON.stringify(context.input_data, null, 2)}`,
      },
    ];

    const toolCalls: any[] = [];
    const toolsUsed: string[] = [];
    const decisions: any[] = [];
    let iterations = 0;
    let finalOutput: any = null;
    let reasoning = "";

    while (iterations < maxIterations) {
      iterations++;

      // Call model with tools to get next action
      const result = await this.callModelWithTools(
        modelClient,
        messages,
        node.model_config,
        tools,
      );

      // Check if tool calls were made
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const tc of result.toolCalls) {
          const tool = tools.get(tc.toolName);

          if (!tool) {
            throw new Error(`Tool not found: ${tc.toolName}`);
          }

          // Execute tool
          const toolResult = await tool.execute(tc.args);

          toolCalls.push({
            tool: tc.toolName,
            arguments: tc.args,
            result: toolResult,
            timestamp: new Date().toISOString(),
          });

          toolsUsed.push(tc.toolName);

          decisions.push({
            type: "tool_executed",
            tool: tc.toolName,
            success: true,
          });
        }

        // Add assistant response and tool results into conversation for next iteration
        messages.push({
          role: "assistant",
          content: result.text || `Used tools: ${result.toolCalls.map((tc: any) => tc.toolName).join(", ")}`,
        });

        messages.push({
          role: "user",
          content: `Tool results:\n${toolCalls.slice(-result.toolCalls.length).map((tc: any) => `${tc.tool}: ${JSON.stringify(tc.result)}`).join("\n")}`,
        });
      } else {
        // Agent is done - no more tool calls
        finalOutput = result.text;
        break;
      }
    }

    return {
      output: finalOutput || "Execution completed",
      reasoning,
      tool_calls: toolCalls,
      iterations,
      execution_time_ms: 0,
      memory_used: false,
      knowledge_accessed: false,
      decisions,
      confidence: 0.8,
      tools_used: [...new Set(toolsUsed)],
    };
  }

  /**
   * Execute analyzer agent - analyzes data and provides insights
   */
  private async executeAnalyzerAgent(
    node: AgentNode,
    context: NodeExecutionContext,
    modelClient: any,
    memoryStore: any,
    knowledgeBase: any,
  ): Promise<any> {
    const systemPrompt = `You are an analysis agent. Your goal is to analyze the provided data and provide insights.

Goal: ${node.goal}

Instructions: ${node.instructions || "Analyze the data thoroughly and provide clear insights."}

Provide structured analysis with key findings, patterns, and recommendations.`;

    let messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Data to analyze: ${JSON.stringify(context.input_data, null, 2)}`,
      },
    ];

    // Retrieve relevant information from knowledge base if available
    let knowledgeAccessed = false;
    if (knowledgeBase) {
      const relevantDocs = await knowledgeBase.search(context.input_data);
      if (relevantDocs.length > 0) {
        messages.push({
          role: "system",
          content: `Relevant context from knowledge base:\n${JSON.stringify(relevantDocs, null, 2)}`,
        });
        knowledgeAccessed = true;
      }
    }

    const text = await this.callModel(
      modelClient,
      messages,
      node.model_config,
    );

    return {
      output: text,
      reasoning: "",
      tool_calls: [],
      iterations: 1,
      execution_time_ms: 0,
      memory_used: false,
      knowledge_accessed: knowledgeAccessed,
      decisions: [
        {
          type: "analysis_completed",
          details: "Data analysis completed successfully",
        },
      ],
      confidence: 0.85,
      tools_used: [],
    };
  }

  /**
   * Execute recovery agent - handles errors and recovery
   */
  private async executeRecoveryAgent(
    node: AgentNode,
    context: NodeExecutionContext,
    modelClient: any,
    tools: Map<string, any>,
  ): Promise<any> {
    const systemPrompt = `You are a recovery agent. Your goal is to analyze errors and determine recovery strategies.

Goal: ${node.goal}

Available tools: ${this.getToolDescriptions(tools)}

Instructions: ${node.instructions || "Analyze the error and determine the best recovery strategy."}

Provide step-by-step recovery instructions and specify which tools to use.`;

    const errorContext = context.previous_results?.error
      ? `Error details: ${JSON.stringify(context.previous_results.error, null, 2)}`
      : "No error details available";

    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: `${errorContext}\n\nInput data: ${JSON.stringify(context.input_data, null, 2)}`,
      },
    ];

    const result = await this.callModelWithTools(
      modelClient,
      messages,
      node.model_config,
      tools,
    );

    return {
      output: result.text,
      reasoning: "",
      tool_calls: result.toolCalls || [],
      iterations: 1,
      execution_time_ms: 0,
      memory_used: false,
      knowledge_accessed: false,
      decisions: [
        {
          type: "recovery_plan",
          details: "Recovery strategy determined",
        },
      ],
      confidence: 0.75,
      tools_used: [],
    };
  }

  /**
   * Call model using Vercel AI SDK's generateText
   */
  private async callModel(
    provider: any,
    messages: any[],
    modelConfig: any,
  ): Promise<string> {
    const model =
      modelConfig.model ||
      process.env.AI_MODEL ||
      "llama-3.3-70b-versatile";

    try {
      const result = await generateText({
        model: provider(model),
        messages,
        temperature: modelConfig.temperature ?? 0.7,
        maxTokens: modelConfig.max_tokens ?? 4000,
      });

      return result.text;
    } catch (error: any) {
      throw new Error(`Model call failed: ${error.message}`);
    }
  }

  /**
   * Call model with tools using Vercel AI SDK's generateText
   */
  private async callModelWithTools(
    provider: any,
    messages: any[],
    modelConfig: any,
    tools: Map<string, any>,
  ): Promise<any> {
    const model =
      modelConfig.model ||
      process.env.AI_MODEL ||
      "llama-3.3-70b-versatile";

    try {
      // Build tool descriptions into the system prompt so the model can
      // reason about them, but use generateText without the AI SDK tool
      // parameter to keep compatibility with all OpenAI-compatible endpoints
      // (many don't support the tools/functions API). The model is instructed
      // to output JSON tool-call blocks which we parse below.
      const toolSchemas = Array.from(tools.entries()).map(([name, t]) => {
        const schema = t.getSchema();
        return schema
          ? { name, description: schema.function.description, parameters: schema.function.parameters }
          : { name, description: "Generic tool", parameters: {} };
      });

      const toolInstructions = `\nYou have access to the following tools. To call a tool, respond with a JSON block:
\`\`\`tool_call
{"tool": "<tool_name>", "arguments": {<args>}}
\`\`\`

Available tools:
${toolSchemas.map((t) => `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`).join("\n")}

If you do not need to call a tool, respond normally without a tool_call block.`;

      const augmentedMessages = [
        ...messages.slice(0, 1).map((m: any) => ({
          ...m,
          content: m.content + toolInstructions,
        })),
        ...messages.slice(1),
      ];

      const result = await generateText({
        model: provider(model),
        messages: augmentedMessages,
        temperature: modelConfig.temperature ?? 0.7,
        maxTokens: modelConfig.max_tokens ?? 4000,
      });

      // Parse tool calls from the response text
      const parsedToolCalls = this.parseToolCalls(result.text);

      return {
        text: result.text,
        toolCalls: parsedToolCalls,
      };
    } catch (error: any) {
      throw new Error(`Model call with tools failed: ${error.message}`);
    }
  }

  /**
   * Parse tool call blocks from model response text.
   * Looks for ```tool_call ... ``` fenced blocks containing JSON.
   */
  private parseToolCalls(text: string): Array<{ toolName: string; args: any }> {
    const toolCalls: Array<{ toolName: string; args: any }> = [];
    const regex = /```tool_call\s*\n?([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.tool) {
          toolCalls.push({
            toolName: parsed.tool,
            args: parsed.arguments || {},
          });
        }
      } catch {
        // Skip malformed tool call blocks
      }
    }

    return toolCalls;
  }

  /**
   * Get tool descriptions for agent
   */
  private getToolDescriptions(tools: Map<string, any>): string {
    const descriptions: string[] = [];

    for (const [name, tool] of tools.entries()) {
      const schema = tool.getSchema();
      if (schema) {
        descriptions.push(`- ${name}: ${schema.function.description}`);
      } else {
        descriptions.push(`- ${name}: Generic tool`);
      }
    }

    return descriptions.join("\n");
  }
}
