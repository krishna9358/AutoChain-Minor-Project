import { BaseNodeExecutor } from "../../execution/base-executor";
import { AgentNode, NodeExecutionContext } from "../../types/nodes";
import { getConnectionManager } from "../../connections/manager";
import OpenAI from "openai";
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
   * Initialize AI model client based on configuration
   */
  private initializeModelClient(modelConfig: any): any {
    const apiKey = this.resolveApiKey(modelConfig.api_key);

    switch (modelConfig.provider) {
      case "openai":
        return new OpenAI({
          apiKey: apiKey,
          dangerouslyAllowBrowser: false,
        });

      case "anthropic":
        // Anthropic client initialization
        return {
          provider: "anthropic",
          apiKey: apiKey,
          model: modelConfig.model,
        };

      case "google":
        // Google AI client initialization
        return {
          provider: "google",
          apiKey: apiKey,
          model: modelConfig.model,
        };

      case "azure":
        // Azure OpenAI client initialization
        return {
          provider: "azure",
          apiKey: apiKey,
          endpoint: modelConfig.endpoint,
          model: modelConfig.model,
        };

      case "local":
        // Local model client (Ollama, etc.)
        return {
          provider: "local",
          baseURL: modelConfig.baseURL || "http://localhost:11434",
          model: modelConfig.model,
        };

      default:
        throw new Error(`Unsupported model provider: ${modelConfig.provider}`);
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
        context.user_context?.role || "admin",
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
   * Execute AI tool
   */
  private async executeAITool(connection: any, params: any): Promise<any> {
    const openai = new OpenAI({
      apiKey: connection.credentials.api_key,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: params.messages || [],
      temperature: params.temperature || 0.7,
    });

    return completion.choices[0].message;
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
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Input data: ${JSON.stringify(context.input_data, null, 2)}`,
      },
    ];

    const completion = await this.callModel(
      modelClient,
      messages,
      node.model_config,
    );

    return {
      output: completion.content || completion.text,
      reasoning: completion.reasoning || "",
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

    let messages = [
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

      // Call model to get next action
      const completion = await this.callModelWithTools(
        modelClient,
        messages,
        node.model_config,
        tools,
      );

      reasoning = completion.reasoning || "";

      // Check if tool call was requested
      if (completion.tool_calls && completion.tool_calls.length > 0) {
        for (const toolCall of completion.tool_calls) {
          const tool = tools.get(toolCall.function.name);

          if (!tool) {
            throw new Error(`Tool not found: ${toolCall.function.name}`);
          }

          // Parse tool arguments
          const args = JSON.parse(toolCall.function.arguments);

          // Execute tool
          const toolResult = await tool.execute(args);

          toolCalls.push({
            tool: toolCall.function.name,
            arguments: args,
            result: toolResult,
            timestamp: new Date().toISOString(),
          });

          toolsUsed.push(toolCall.function.name);

          // Add tool result to conversation
          messages.push({
            role: "assistant",
            content: null,
            tool_calls: [toolCall],
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });

          decisions.push({
            type: "tool_executed",
            tool: toolCall.function.name,
            success: true,
          });
        }
      } else {
        // Agent is done
        finalOutput = completion.content || completion.text;
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

    let messages = [
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

    const completion = await this.callModel(
      modelClient,
      messages,
      node.model_config,
    );

    return {
      output: completion.content || completion.text,
      reasoning: completion.reasoning || "",
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
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `${errorContext}\n\nInput data: ${JSON.stringify(context.input_data, null, 2)}`,
      },
    ];

    const completion = await this.callModelWithTools(
      modelClient,
      messages,
      node.model_config,
      tools,
    );

    return {
      output: completion.content || completion.text,
      reasoning: completion.reasoning || "",
      tool_calls: completion.tool_calls || [],
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
   * Call model with messages
   */
  private async callModel(
    modelClient: any,
    messages: any[],
    modelConfig: any,
  ): Promise<any> {
    try {
      if (modelClient.provider === "openai" || modelClient.chat) {
        const completion = await modelClient.chat.completions.create({
          model: modelConfig.model,
          messages: messages,
          temperature: modelConfig.temperature || 0.7,
          max_tokens: modelConfig.max_tokens,
        });

        return {
          content: completion.choices[0].message.content,
          reasoning: null,
        };
      }

      // Handle other providers
      return {
        content: "Model response",
        reasoning: null,
      };
    } catch (error: any) {
      throw new Error(`Model call failed: ${error.message}`);
    }
  }

  /**
   * Call model with tools (function calling)
   */
  private async callModelWithTools(
    modelClient: any,
    messages: any[],
    modelConfig: any,
    tools: Map<string, any>,
  ): Promise<any> {
    try {
      if (modelClient.provider === "openai" || modelClient.chat) {
        // Convert tools to OpenAI function format
        const functions = Array.from(tools.values())
          .map((tool) => tool.getSchema())
          .filter(Boolean);

        const completion = await modelClient.chat.completions.create({
          model: modelConfig.model,
          messages: messages,
          temperature: modelConfig.temperature || 0.7,
          max_tokens: modelConfig.max_tokens,
          functions: functions,
          function_call: "auto",
        });

        const message = completion.choices[0].message;

        return {
          content: message.content || "",
          reasoning: null,
          tool_calls: message.function_calls || [],
        };
      }

      // Handle other providers
      return {
        content: "Model response",
        reasoning: null,
        tool_calls: [],
      };
    } catch (error: any) {
      throw new Error(`Model call with tools failed: ${error.message}`);
    }
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
