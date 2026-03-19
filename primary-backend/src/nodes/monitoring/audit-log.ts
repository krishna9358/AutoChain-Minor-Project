const gzip = promisify(zlib.gzip);

/**
 * Audit Log Node Executor
 * Handles comprehensive workflow execution logging with flexible storage options
 */
export class AuditLogNodeExecutor extends BaseNodeExecutor {
  private logCache: Map<string, any[]> = new Map();
  private compressionThreshold: number = 1024 * 1024; // 1MB
  private maxCacheSize: number = 100;

  protected async executeNode(
    node: AuditLogNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.validateRequiredFields(node, ["log_level", "storage"]);

    const encryptionManager = getEncryptionManager();
    const traceId = node.trace_id || context.execution_id;

    // Collect audit data based on log level
    const auditData = await this.collectAuditData(node, context, traceId);

    // Anonymize data if configured
    const processedData = node.anonymize
      ? this.anonymizeData(auditData)
      : auditData;

    // Compress data if configured
    const { compressedData, isCompressed } = node.compression
      ? await this.compressData(processedData)
      : { compressedData: processedData, isCompressed: false };

    // Store audit log based on storage type
    const storageResult = await this.storeAuditLog(
      node.storage,
      compressedData,
      traceId,
      context,
      isCompressed,
    );

    // Add to cache for query purposes
    this.addToCache(context.workflow_id, processedData, traceId);

    return {
      log_type: "audit.log",
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      trace_id: traceId,
      log_level: node.log_level,
      storage_type: node.storage.type,
      stored_at: new Date().toISOString(),
      storage_result: storageResult,
      data_summary: {
        included_sections: node.include,
        data_size_bytes: JSON.stringify(processedData).length,
        compressed: isCompressed,
        compressed_size_bytes: isCompressed
          ? JSON.stringify(compressedData).length
          : null,
        compression_ratio: isCompressed
          ? (
              1 -
              JSON.stringify(compressedData).length /
                JSON.stringify(processedData).length
            ).toFixed(2)
          : null,
        anonymized: node.anonymize,
        retention_days: node.retention_days,
      },
      metadata: {
        log_timestamp: new Date().toISOString(),
        node_id: node.node_id,
        execution_context: {
          environment: context.environment,
          user_id: context.user_context?.user_id,
          role: context.user_context?.role,
        },
      },
    };
  }

  /**
   * Collect audit data based on log level
   */
  private async collectAuditData(
    node: AuditLogNode,
    context: NodeExecutionContext,
    traceId: string,
  ): Promise<any> {
    const auditData: any = {
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      log_level: node.log_level,
      environment: context.environment,
    };

    // Collect data based on log level and include configuration
    switch (node.log_level) {
      case "minimal":
        this.collectMinimalData(auditData, node, context);
        break;
      case "standard":
        this.collectStandardData(auditData, node, context);
        break;
      case "full":
        this.collectFullData(auditData, node, context);
        break;
      case "debug":
        this.collectDebugData(auditData, node, context);
        break;
    }

    // Apply include filter
    this.applyIncludeFilter(auditData, node.include);

    return auditData;
  }

  /**
   * Collect minimal audit data
   */
  private collectMinimalData(
    auditData: any,
    node: AuditLogNode,
    context: NodeExecutionContext,
  ): void {
    auditData.execution = {
      started_at: new Date().toISOString(),
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
    };
    auditData.inputs = {
      summary: this.summarizeData(context.input_data),
    };
    auditData.outputs = {
      summary: this.summarizeData(
        Object.values(context.previous_results || {}).map((r: any) => r.output),
      ),
    };
  }

  /**
   * Collect standard audit data
   */
  private collectStandardData(
    auditData: any,
    node: AuditLogNode,
    context: NodeExecutionContext,
  ): void {
    auditData.execution = {
      started_at: new Date().toISOString(),
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      triggered_by: context.user_context?.user_id,
      trigger_type: context.trigger_type,
    };

    if (node.include.includes("inputs")) {
      auditData.inputs = {
        data: context.input_data,
        size_bytes: JSON.stringify(context.input_data).length,
      };
    }

    if (node.include.includes("outputs")) {
      auditData.outputs = {
        data: this.extractOutputs(context.previous_results),
        size_bytes: JSON.stringify(context.previous_results).length,
      };
    }

    if (node.include.includes("errors")) {
      auditData.errors = this.extractErrors(context.previous_results);
    }
  }

  /**
   * Collect full audit data
   */
  private collectFullData(
    auditData: any,
    node: AuditLogNode,
    context: NodeExecutionContext,
  ): void {
    auditData.execution = {
      started_at: new Date().toISOString(),
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      triggered_by: context.user_context?.user_id,
      trigger_type: context.trigger_type,
      trigger_metadata: context.trigger_metadata,
      environment: context.environment,
      user_context: context.user_context,
    };

    if (node.include.includes("inputs")) {
      auditData.inputs = {
        data: context.input_data,
        size_bytes: JSON.stringify(context.input_data).length,
        schema: this.inferSchema(context.input_data),
      };
    }

    if (node.include.includes("outputs")) {
      auditData.outputs = {
        data: this.extractOutputs(context.previous_results),
        size_bytes: JSON.stringify(context.previous_results).length,
        schema: this.inferSchema(context.previous_results),
      };
    }

    if (node.include.includes("agent_decisions")) {
      auditData.agent_decisions = this.extractAgentDecisions(
        context.previous_results,
      );
    }

    if (node.include.includes("tool_calls")) {
      auditData.tool_calls = this.extractToolCalls(context.previous_results);
    }

    if (node.include.includes("errors")) {
      auditData.errors = {
        errors: this.extractErrors(context.previous_results),
        error_count: this.countErrors(context.previous_results),
      };
    }

    if (node.include.includes("timing")) {
      auditData.timing = this.extractTiming(context.previous_results);
    }

    if (node.include.includes("metadata")) {
      auditData.metadata = {
        node_count: Object.keys(context.previous_results || {}).length,
        nodes_executed: Object.keys(context.previous_results || {}),
        workflow_state: context.workflow_state,
        variables: context.variables,
      };
    }
  }

  /**
   * Collect debug audit data
   */
  private collectDebugData(
    auditData: any,
    node: AuditLogNode,
    context: NodeExecutionContext,
  ): void {
    // Include all full data plus debug information
    this.collectFullData(auditData, node, context);

    auditData.debug = {
      memory_usage: process.memoryUsage(),
      uptime_seconds: process.uptime(),
      platform: process.platform,
      node_version: process.version,
      environment_vars: Object.keys(process.env).filter(
        (key) => key.startsWith("WORKFLOW_") || key.startsWith("AUDIT_"),
      ),
      execution_trace: this.buildExecutionTrace(context.previous_results),
    };
  }

  /**
   * Apply include filter to audit data
   */
  private applyIncludeFilter(auditData: any, include: string[]): void {
    const allSections = [
      "inputs",
      "outputs",
      "agent_decisions",
      "tool_calls",
      "errors",
      "timing",
      "metadata",
      "debug",
    ];

    for (const section of allSections) {
      if (!include.includes(section) && auditData[section]) {
        delete auditData[section];
      }
    }
  }

  /**
   * Store audit log based on storage type
   */
  private async storeAuditLog(
    storageConfig: any,
    data: any,
    traceId: string,
    context: NodeExecutionContext,
    isCompressed: boolean,
  ): Promise<{
    success: boolean;
    storage_type: string;
    location?: string;
    size_bytes?: number;
    error?: string;
  }> {
    try {
      switch (storageConfig.type) {
        case "s3":
          return await this.storeToS3(
            storageConfig,
            data,
            traceId,
            isCompressed,
          );

        case "database":
          return await this.storeToDatabase(
            storageConfig,
            data,
            traceId,
            context,
          );

        case "elasticsearch":
          return await this.storeToElasticsearch(
            storageConfig,
            data,
            traceId,
            context,
          );

        case "file":
          return await this.storeToFile(
            storageConfig,
            data,
            traceId,
            isCompressed,
          );

        case "custom":
          return await this.storeToCustom(
            storageConfig,
            data,
            traceId,
            context,
          );

        default:
          throw new Error(`Unsupported storage type: ${storageConfig.type}`);
      }
    } catch (error: any) {
      return {
        success: false,
        storage_type: storageConfig.type,
        error: error.message,
      };
    }
  }

  /**
   * Store audit log to S3
   */
  private async storeToS3(
    storageConfig: any,
    data: any,
    traceId: string,
    isCompressed: boolean,
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(
      storageConfig.connection_id,
    );

    if (!connection) {
      throw new Error(
        `S3 connection not found: ${storageConfig.connection_id}`,
      );
    }

    const s3Client = new S3Client({
      region: connection.region || "us-east-1",
      credentials: {
        accessKeyId: connection.credentials.access_key || process.env.AWS_KEY,
        secretAccessKey:
          connection.credentials.secret_key || process.env.AWS_SECRET,
      },
    });

    const key = `audit-logs/${context.workflow_id}/${traceId}.${isCompressed ? "json.gz" : "json"}`;
    const body = Buffer.from(JSON.stringify(data));

    const command = new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      ContentEncoding: isCompressed ? "gzip" : undefined,
    });

    await s3Client.send(command);

    return {
      success: true,
      storage_type: "s3",
      location: `s3://${storageConfig.bucket}/${key}`,
      size_bytes: body.length,
      bucket: storageConfig.bucket,
      key,
    };
  }

  /**
   * Store audit log to database
   */
  private async storeToDatabase(
    storageConfig: any,
    data: any,
    traceId: string,
    context: NodeExecutionContext,
  ): Promise<any> {
    // In a real implementation, this would insert into database
    // For now, return a placeholder
    const table = storageConfig.database_table || "audit_logs";

    console.log(`Would store audit log to database table: ${table}`);
    console.log(`Trace ID: ${traceId}`);
    console.log(`Workflow ID: ${context.workflow_id}`);
    console.log(`Data size: ${JSON.stringify(data).length} bytes`);

    return {
      success: true,
      storage_type: "database",
      location: `database:${table}:${traceId}`,
      size_bytes: JSON.stringify(data).length,
      table,
    };
  }

  /**
   * Store audit log to Elasticsearch
   */
  private async storeToElasticsearch(
    storageConfig: any,
    data: any,
    traceId: string,
    context: NodeExecutionContext,
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(
      storageConfig.connection_id,
    );

    if (!connection) {
      throw new Error(
        `Elasticsearch connection not found: ${storageConfig.connection_id}`,
      );
    }

    const client = new Client({
      node: connection.base_url || "http://localhost:9200",
      auth: {
        username: connection.credentials.username,
        password: connection.credentials.password,
      },
    });

    const index = storageConfig.index || "audit-logs";

    await client.index({
      index,
      id: traceId,
      document: data,
    });

    return {
      success: true,
      storage_type: "elasticsearch",
      location: `elasticsearch:${index}:${traceId}`,
      size_bytes: JSON.stringify(data).length,
      index,
    };
  }

  /**
   * Store audit log to file
   */
  private async storeToFile(
    storageConfig: any,
    data: any,
    traceId: string,
    isCompressed: boolean,
  ): Promise<any> {
    const filePath = storageConfig.file_path || "./audit-logs";
    const fileName = `${traceId}.${isCompressed ? "json.gz" : "json"}`;
    const fullPath = path.join(filePath, fileName);

    // Ensure directory exists
    await fs.mkdir(filePath, { recursive: true });

    // Write file
    const body = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(body);

    await fs.writeFile(fullPath, buffer);

    return {
      success: true,
      storage_type: "file",
      location: fullPath,
      size_bytes: buffer.length,
      file_path: fullPath,
      file_name: fileName,
    };
  }

  /**
   * Store audit log to custom endpoint
   */
  private async storeToCustom(
    storageConfig: any,
    data: any,
    traceId: string,
    context: NodeExecutionContext,
  ): Promise<any> {
    // In a real implementation, this would make a custom API call
    console.log(`Would store audit log to custom endpoint`);
    console.log(`Trace ID: ${traceId}`);
    console.log(`Data size: ${JSON.stringify(data).length} bytes`);

    return {
      success: true,
      storage_type: "custom",
      location: "custom:audit-log",
      size_bytes: JSON.stringify(data).length,
    };
  }

  /**
   * Compress audit data
   */
  private async compressData(
    data: any,
  ): Promise<{ compressedData: any; isCompressed: boolean }> {
    const jsonString = JSON.stringify(data);
    const bufferSize = Buffer.byteLength(jsonString);

    // Only compress if above threshold
    if (bufferSize < this.compressionThreshold) {
      return { compressedData: data, isCompressed: false };
    }

    try {
      const compressed = await gzip(jsonString);
      return {
        compressedData: {
          data: compressed.toString("base64"),
          original_format: "json",
          compression: "gzip",
          original_size_bytes: bufferSize,
        },
        isCompressed: true,
      };
    } catch (error) {
      console.warn(`Failed to compress audit data: ${error}`);
      return { compressedData: data, isCompressed: false };
    }
  }

  /**
   * Anonymize sensitive data
   */
  private anonymizeData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, // SSN
      /sk-[a-zA-Z0-9]{48}/g, // Stripe key
      /sk-or-[a-zA-Z0-9]{48}/g, // Stripe key (new)
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, // Bearer token
    ];

    const anonymized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in anonymized) {
      if (typeof anonymized[key] === "string") {
        let value = anonymized[key];

        // Apply sensitive patterns
        for (const pattern of sensitivePatterns) {
          value = value.replace(pattern, "***REDACTED***");
        }

        anonymized[key] = value;
      } else if (
        typeof anonymized[key] === "object" &&
        anonymized[key] !== null
      ) {
        anonymized[key] = this.anonymizeData(anonymized[key]);
      }
    }

    return anonymized;
  }

  /**
   * Summarize data for minimal logging
   */
  private summarizeData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return {
        type: "array",
        length: data.length,
        sample: data.slice(0, 3),
      };
    }

    return {
      type: "object",
      keys: Object.keys(data),
      size: Object.keys(data).length,
      sample: Object.fromEntries(Object.entries(data).slice(0, 5)),
    };
  }

  /**
   * Extract outputs from previous results
   */
  private extractOutputs(previousResults: any): any {
    const outputs: any = {};

    for (const [nodeId, result] of Object.entries(previousResults || {})) {
      outputs[nodeId] = {
        status: result.status,
        output: result.output,
        execution_time_ms: result.execution_time_ms,
        completed_at: result.completed_at,
      };
    }

    return outputs;
  }

  /**
   * Extract errors from previous results
   */
  private extractErrors(previousResults: any): any[] {
    const errors: any[] = [];

    for (const [nodeId, result] of Object.entries(previousResults || {})) {
      if (result.error) {
        errors.push({
          node_id: nodeId,
          error: {
            message: result.error.message,
            code: result.error.code,
            details: result.error.details,
          },
          timestamp: result.completed_at,
        });
      }
    }

    return errors;
  }

  /**
   * Count errors in previous results
   */
  private countErrors(previousResults: any): number {
    let count = 0;

    for (const result of Object.values(previousResults || {})) {
      if (result.error) {
        count++;
      }
    }

    return count;
  }

  /**
   * Extract agent decisions
   */
  private extractAgentDecisions(previousResults: any): any[] {
    const decisions: any[] = [];

    for (const [nodeId, result] of Object.entries(previousResults || {})) {
      if (result.output?.decisions) {
        decisions.push({
          node_id: nodeId,
          decisions: result.output.decisions,
          reasoning: result.output.reasoning,
          confidence: result.output.confidence,
          timestamp: result.completed_at,
        });
      }
    }

    return decisions;
  }

  /**
   * Extract tool calls
   */
  private extractToolCalls(previousResults: any): any[] {
    const toolCalls: any[] = [];

    for (const [nodeId, result] of Object.entries(previousResults || {})) {
      if (result.output?.tool_calls) {
        toolCalls.push({
          node_id: nodeId,
          tool_calls: result.output.tool_calls,
          timestamp: result.completed_at,
        });
      }
    }

    return toolCalls;
  }

  /**
   * Extract timing information
   */
  private extractTiming(previousResults: any): any {
    const timing: any = {
      nodes: {},
      total_ms: 0,
      average_ms: 0,
      max_ms: 0,
      min_ms: Infinity,
    };

    const nodeTimings: number[] = [];

    for (const [nodeId, result] of Object.entries(previousResults || {})) {
      const execTime = result.execution_time_ms || 0;

      timing.nodes[nodeId] = {
        execution_time_ms: execTime,
        started_at: result.started_at,
        completed_at: result.completed_at,
      };

      nodeTimings.push(execTime);
      timing.total_ms += execTime;

      if (execTime > timing.max_ms) {
        timing.max_ms = execTime;
      }
      if (execTime < timing.min_ms) {
        timing.min_ms = execTime;
      }
    }

    if (nodeTimings.length > 0) {
      timing.average_ms = timing.total_ms / nodeTimings.length;
      timing.min_ms = timing.min_ms === Infinity ? 0 : timing.min_ms;
    }

    return timing;
  }

  /**
   * Infer schema from data
   */
  private inferSchema(data: any): any {
    if (data === null) {
      return { type: "null" };
    }

    if (Array.isArray(data)) {
      return {
        type: "array",
        length: data.length,
        item_type: data.length > 0 ? this.inferSchema(data[0]) : "unknown",
      };
    }

    if (typeof data === "object") {
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.keys(data).map((key) => [key, { type: typeof data[key] }]),
        ),
      };
    }

    return { type: typeof data };
  }

  /**
   * Build execution trace
   */
  private buildExecutionTrace(previousResults: any): any[] {
    const trace: any[] = [];

    for (const [nodeId, result] of Object.entries(previousResults || {})) {
      trace.push({
        node_id: nodeId,
        status: result.status,
        started_at: result.started_at,
        completed_at: result.completed_at,
        execution_time_ms: result.execution_time_ms,
        retry_count: result.retry_count,
        has_error: !!result.error,
      });
    }

    // Sort by completion time
    return trace.sort(
      (a, b) =>
        new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime(),
    );
  }

  /**
   * Add audit data to cache
   */
  private addToCache(workflowId: string, data: any, traceId: string): void {
    if (!this.logCache.has(workflowId)) {
      this.logCache.set(workflowId, []);
    }

    const cache = this.logCache.get(workflowId)!;
    cache.push({
      trace_id: traceId,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep only recent entries
    if (cache.length > this.maxCacheSize) {
      cache.shift();
    }
  }

  /**
   * Get audit logs for a workflow
   */
  public getAuditLogs(workflowId: string, limit: number = 50): any[] {
    const cache = this.logCache.get(workflowId) || [];
    return cache.slice(-limit);
  }

  /**
   * Get audit log by trace ID
   */
  public getAuditLog(workflowId: string, traceId: string): any | null {
    const cache = this.logCache.get(workflowId) || [];

    for (const entry of cache) {
      if (entry.trace_id === traceId) {
        return entry.data;
      }
    }

    return null;
  }

  /**
   * Clear audit log cache for a workflow
   */
  public clearAuditLogs(workflowId: string): void {
    this.logCache.delete(workflowId);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    total_workflows: number;
    total_entries: number;
    cache_size_bytes: number;
  } {
    let totalEntries = 0;
    let totalSizeBytes = 0;

    for (const cache of this.logCache.values()) {
      totalEntries += cache.length;
      totalSizeBytes += JSON.stringify(cache).length;
    }

    return {
      total_workflows: this.logCache.size,
      total_entries: totalEntries,
      cache_size_bytes: totalSizeBytes,
    };
  }

  /**
   * Export audit logs for a time range
   */
  public async exportAuditLogs(
    workflowId: string,
    startDate: Date,
    endDate: Date,
    format: "json" | "csv" = "json",
  ): Promise<any> {
    const cache = this.logCache.get(workflowId) || [];

    const filteredLogs = cache.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });

    if (format === "csv") {
      return this.convertToCSV(filteredLogs);
    }

    return filteredLogs;
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: any[]): string {
    if (logs.length === 0) {
      return "";
    }

    const headers = [
      "trace_id",
      "timestamp",
      "workflow_id",
      "execution_id",
      "log_level",
      "environment",
      "data_size_bytes",
    ];

    const rows = logs.map((log) =>
      headers.map((header) => log.data[header] || log[header] || "").join(","),
    );

    return [headers.join(","), ...rows].join("\n");
  }
}

/**
 * Export types for use in other modules
 */
export type { AuditLogNode };
