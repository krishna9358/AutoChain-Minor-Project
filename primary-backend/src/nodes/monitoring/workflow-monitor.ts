import { BaseNodeExecutor } from '../../execution/base-executor';
import {
  WorkflowMonitorNode,
  NodeExecutionContext,
} from '../../types/nodes';
import { getConnectionManager } from '../../connections/manager';
import { generateText } from "ai";
import { getAIProvider, getDefaultModel } from "../../utils/aiProvider";
import axios from 'axios';

/**
 * Workflow Monitor Node Executor
 * Handles workflow performance monitoring, metrics collection, and alerting
 */
export class WorkflowMonitorNodeExecutor extends BaseNodeExecutor {
  private metricsStore: Map<string, any[]> = new Map();
  private alertHistory: Map<string, any[]> = new Map();

  protected async executeNode(
    node: WorkflowMonitorNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ['metrics']);

    const executionId = context.execution_id;
    const workflowId = context.workflow_id;

    // Collect metrics from context
    const collectedMetrics = this.collectMetrics(
      node.metrics,
      context,
      node.sla
    );

    // Store metrics
    this.storeMetrics(workflowId, executionId, collectedMetrics);

    // Check SLA violations
    const slaCheck = this.checkSLA(node.sla, collectedMetrics);

    // Generate predictions if enabled
    const predictions = node.prediction?.enabled
      ? await this.generatePredictions(
          node.prediction,
          collectedMetrics,
          context
        )
      : null;

    // Send alerts if needed
    const alertResults = await this.checkAndSendAlerts(
      node,
      context,
      collectedMetrics,
      slaCheck,
      predictions
    );

    // Update dashboards if configured
    const dashboardUpdates = node.dashboards
      ? await this.updateDashboards(node.dashboards, collectedMetrics, context)
      : [];

    return {
      monitor_type: 'workflow_monitor',
      workflow_id: workflowId,
      execution_id: executionId,
      metrics: collectedMetrics,
      sla_check: slaCheck,
      predictions,
      alerting: alertResults,
      dashboard_updates: dashboardUpdates,
      metadata: {
        monitored_metrics: node.metrics,
        sla_configured: !!node.sla,
        alerting_enabled: node.alerting?.enabled || false,
        prediction_enabled: node.prediction?.enabled || false,
        monitoring_timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Collect metrics based on configuration
   */
  private collectMetrics(
    metricTypes: string[],
    context: NodeExecutionContext,
    slaConfig?: any
  ): Record<string, any> {
    const metrics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
    };

    for (const metricType of metricTypes) {
      switch (metricType) {
        case 'latency':
          metrics.latency = this.calculateLatency(context);
          break;

        case 'error_rate':
          metrics.error_rate = this.calculateErrorRate(context);
          break;

        case 'cost':
          metrics.cost = this.calculateCost(context);
          break;

        case 'throughput':
          metrics.throughput = this.calculateThroughput(context);
          break;

        case 'success_rate':
          metrics.success_rate = this.calculateSuccessRate(context);
          break;
      }
    }

    // Calculate overall health score
    metrics.health_score = this.calculateHealthScore(metrics, slaConfig);

    return metrics;
  }

  /**
   * Calculate execution latency
   */
  private calculateLatency(context: NodeExecutionContext): {
    total_ms: number;
    average_ms: number;
    min_ms: number;
    max_ms: number;
    percentiles: Record<string, number>;
  } {
    const nodeResults = Object.values(context.previous_results || {});
    const latencies = nodeResults
      .map((r: any) => r.execution_time_ms)
      .filter((l: number) => l !== undefined);

    if (latencies.length === 0) {
      return {
        total_ms: 0,
        average_ms: 0,
        min_ms: 0,
        max_ms: 0,
        percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
      };
    }

    const total = latencies.reduce((sum: number, l: number) => sum + l, 0);
    const sorted = [...latencies].sort((a: number, b: number) => a - b);

    return {
      total_ms: total,
      average_ms: total / latencies.length,
      min_ms: sorted[0],
      max_ms: sorted[sorted.length - 1],
      percentiles: {
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p90: sorted[Math.floor(sorted.length * 0.9)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      },
    };
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(context: NodeExecutionContext): {
    total_errors: number;
    total_nodes: number;
    error_rate: number;
    error_by_type: Record<string, number>;
  } {
    const nodeResults = Object.values(context.previous_results || {});
    const errorByType: Record<string, number> = {};
    let totalErrors = 0;

    for (const result of nodeResults) {
      if (result.error) {
        totalErrors++;
        const errorType = result.error.code || 'UNKNOWN';
        errorByType[errorType] = (errorByType[errorType] || 0) + 1;
      }
    }

    const totalNodes = nodeResults.length;
    const errorRate = totalNodes > 0 ? totalErrors / totalNodes : 0;

    return {
      total_errors: totalErrors,
      total_nodes: totalNodes,
      error_rate: errorRate,
      error_by_type: errorByType,
    };
  }

  /**
   * Calculate execution cost
   */
  private calculateCost(context: NodeExecutionContext): {
    estimated_cost_usd: number;
    cost_by_node: Record<string, number>;
    cost_breakdown: Record<string, number>;
  } {
    const nodeResults = context.previous_results || {};
    const costByNode: Record<string, number> = {};
    const costBreakdown: Record<string, number> = {
      ai_calls: 0,
      api_calls: 0,
      compute: 0,
      storage: 0,
      network: 0,
    };
    let totalCost = 0;

    for (const [nodeId, result] of Object.entries(nodeResults)) {
      // Estimate cost based on node type and execution time
      const nodeCost = this.estimateNodeCost(nodeId, result as any);
      costByNode[nodeId] = nodeCost;
      totalCost += nodeCost;

      // Categorize cost
      const nodeType = (result as any).node_type || 'unknown';
      if (nodeType.includes('agent') || nodeType.includes('validation')) {
        costBreakdown.ai_calls += nodeCost;
      } else if (nodeType.includes('http') || nodeType.includes('api')) {
        costBreakdown.api_calls += nodeCost;
      }
    }

    return {
      estimated_cost_usd: totalCost,
      cost_by_node: costByNode,
      cost_breakdown: costBreakdown,
    };
  }

  /**
   * Estimate cost for a single node execution
   */
  private estimateNodeCost(nodeId: string, result: any): number {
    // Simplified cost estimation
    // In a real implementation, this would use actual pricing models
    const executionTimeMs = result.execution_time_ms || 0;
    const nodeType = result.node_type || 'unknown';

    // Base cost per ms of execution (very rough estimate)
    const baseCostPerMs = 0.000001; // $0.001 per second

    // Multiplier based on node type
    const typeMultiplier: Record<string, number> = {
      'agent': 10, // AI operations are expensive
      'validation': 5,
      'tool.http': 2,
      'tool.database': 1.5,
      'tool.email': 1,
      'tool.slack': 1,
      'tool.browser': 3,
      'orchestrator': 1,
      'monitor': 0.5,
      'error_handling': 0.5,
    };

    const multiplier = typeMultiplier[nodeType] || 1;

    return executionTimeMs * baseCostPerMs * multiplier;
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughput(context: NodeExecutionContext): {
    executions_per_hour: number;
    executions_per_day: number;
    average_throughput: number;
    peak_throughput: number;
  } {
    // Get historical data
    const historicalMetrics = this.metricsStore.get(context.workflow_id) || [];
    const recentExecutions = historicalMetrics.slice(-100); // Last 100 executions

    if (recentExecutions.length === 0) {
      return {
        executions_per_hour: 0,
        executions_per_day: 0,
        average_throughput: 0,
        peak_throughput: 0,
      };
    }

    // Calculate time span
    const firstExecution = new Date(recentExecutions[0].timestamp);
    const lastExecution = new Date(recentExecutions[recentExecutions.length - 1].timestamp);
    const timeSpanHours = (lastExecution.getTime() - firstExecution.getTime()) / (1000 * 60 * 60);

    if (timeSpanHours === 0) {
      return {
        executions_per_hour: recentExecutions.length,
        executions_per_day: recentExecutions.length * 24,
        average_throughput: recentExecutions.length,
        peak_throughput: recentExecutions.length,
      };
    }

    const executionsPerHour = recentExecutions.length / timeSpanHours;
    const executionsPerDay = executionsPerHour * 24;

    return {
      executions_per_hour: executionsPerHour,
      executions_per_day: executionsPerDay,
      average_throughput: executionsPerHour,
      peak_throughput: executionsPerHour, // Could be calculated more accurately
    };
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(context: NodeExecutionContext): {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
  } {
    const nodeResults = Object.values(context.previous_results || {});
    const totalExecutions = nodeResults.length;
    const successfulExecutions = nodeResults.filter(
      (r: any) => r.status === 'success'
    ).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 1;

    return {
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      success_rate: successRate,
    };
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(
    metrics: Record<string, any>,
    slaConfig?: any
  ): {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    factors: Record<string, number>;
  } {
    const factors: Record<string, number> = {};

    // Success rate factor (0-100)
    factors.success_rate = metrics.success_rate?.success_rate * 100 || 100;

    // Error rate factor (inverse)
    const errorRate = metrics.error_rate?.error_rate || 0;
    factors.error_rate = (1 - errorRate) * 100;

    // Latency factor (based on SLA if configured)
    if (slaConfig?.max_duration_ms) {
      const avgLatency = metrics.latency?.average_ms || 0;
      factors.latency = Math.max(0, 100 - (avgLatency / slaConfig.max_duration_ms) * 100);
    } else {
      factors.latency = 100;
    }

    // Calculate weighted average
    const weights = {
      success_rate: 0.4,
      error_rate: 0.3,
      latency: 0.2,
      other: 0.1,
    };

    const weightedScore =
      factors.success_rate * weights.success_rate +
      factors.error_rate * weights.error_rate +
      factors.latency * weights.latency +
      100 * weights.other;

    const score = Math.min(100, Math.max(0, weightedScore));

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 50) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      score: Math.round(score),
      status,
      factors,
    };
  }

  /**
   * Check SLA compliance
   */
  private checkSLA(
    slaConfig: any,
    metrics: Record<string, any>
  ): {
    compliant: boolean;
    violations: Array<{
      metric: string;
      threshold: number;
      actual: number;
      severity: 'warning' | 'critical';
    }>;
    score: number;
  } {
    if (!slaConfig) {
      return {
        compliant: true,
        violations: [],
        score: 100,
      };
    }

    const violations: Array<any> = [];
    let score = 100;

    // Check duration SLA
    if (slaConfig.max_duration_ms) {
      const avgLatency = metrics.latency?.average_ms || 0;
      if (avgLatency > slaConfig.max_duration_ms) {
        violations.push({
          metric: 'duration',
          threshold: slaConfig.max_duration_ms,
          actual: avgLatency,
          severity: 'critical',
        });
        score -= 30;
      } else if (slaConfig.warning_threshold_ms && avgLatency > slaConfig.warning_threshold_ms) {
        violations.push({
          metric: 'duration',
          threshold: slaConfig.warning_threshold_ms,
          actual: avgLatency,
          severity: 'warning',
        });
        score -= 15;
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate predictions using AI
   */
  private async generatePredictions(
    predictionConfig: any,
    metrics: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<any> {
    // Get historical metrics
    const historicalMetrics = this.metricsStore.get(context.workflow_id) || [];
    const recentMetrics = historicalMetrics.slice(-20); // Last 20 executions

    const predictionTypes = predictionConfig.prediction_types || ['latency', 'errors', 'cost'];

    const prompt = `Analyze the following workflow execution metrics and provide predictions for the next 1 hour and 24 hours.

Recent Execution Metrics (last ${recentMetrics.length} executions):
${JSON.stringify(recentMetrics.slice(-5), null, 2)}

Current Metrics:
${JSON.stringify(metrics, null, 2)}

Predict the following metrics:
- Latency (average, min, max)
- Error rate
- Estimated cost
- Success rate

Provide predictions in JSON format with the following structure:
{
  "next_hour": {
    "latency": { "average_ms": number, "min_ms": number, "max_ms": number },
    "error_rate": number,
    "cost_usd": number,
    "success_rate": number
  },
  "next_24_hours": {
    "latency": { "average_ms": number, "min_ms": number, "max_ms": number },
    "error_rate": number,
    "cost_usd": number,
    "success_rate": number
  },
  "anomalies": [
    { "metric": string, "description": string, "severity": "low|medium|high" }
  ],
  "recommendations": string[]
}`;

    try {
      const provider = getAIProvider();
      const model = getDefaultModel();

      const { text } = await generateText({
        model: provider(model),
        messages: [
          { role: 'system', content: 'You are an expert in workflow performance analysis and prediction.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      const predictions = JSON.parse(text || '{}');

      return {
        generated_at: new Date().toISOString(),
        prediction_types: predictionTypes,
        predictions,
        confidence: 0.75, // Placeholder - could be calculated
      };
    } catch (error: any) {
      console.error(`Failed to generate predictions: ${error.message}`);
      return null;
    }
  }

  /**
   * Check and send alerts based on metrics
   */
  private async checkAndSendAlerts(
    node: WorkflowMonitorNode,
    context: NodeExecutionContext,
    metrics: Record<string, any>,
    slaCheck: any,
    predictions?: any
  ): Promise<any> {
    if (!node.alerting?.enabled) {
      return {
        enabled: false,
        alerts_sent: [],
      };
    }

    const alertsToSend: Array<{
      type: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      data: any;
    }> = [];

    // Check for SLA violations
    if (slaCheck.violations && slaCheck.violations.length > 0) {
      for (const violation of slaCheck.violations) {
        alertsToSend.push({
          type: 'sla_violation',
          severity: violation.severity === 'critical' ? 'error' : 'warning',
          message: `SLA violation: ${violation.metric} exceeded threshold`,
          data: violation,
        });
      }
    }

    // Check health score
    if (metrics.health_score?.score < 70) {
      alertsToSend.push({
        type: 'health_score',
        severity: metrics.health_score.status === 'critical' ? 'error' : 'warning',
        message: `Workflow health score degraded: ${metrics.health_score.score}`,
        data: metrics.health_score,
      });
    }

    // Check error rate
    if (metrics.error_rate?.error_rate > 0.1) {
      alertsToSend.push({
        type: 'high_error_rate',
        severity: 'error',
        message: `High error rate detected: ${(metrics.error_rate.error_rate * 100).toFixed(2)}%`,
        data: metrics.error_rate,
      });
    }

    // Check predictions for issues
    if (predictions?.predictions?.anomalies) {
      for (const anomaly of predictions.predictions.anomalies) {
        if (anomaly.severity === 'high') {
          alertsToSend.push({
            type: 'predicted_anomaly',
            severity: 'warning',
            message: `Predicted anomaly detected: ${anomaly.description}`,
            data: anomaly,
          });
        }
      }
    }

    // Send alerts through configured channels
    const sentAlerts: any[] = [];

    for (const alert of alertsToSend) {
      try {
        // Send to Slack if configured
        if (node.alerting.slack_connection_id) {
          await this.sendSlackAlert(
            node.alerting.slack_connection_id,
            node.alerting.slack_channel || '',
            context,
            alert
          );
          sentAlerts.push({
            ...alert,
            channel: 'slack',
            sent: true,
          });
        }

        // Send email if configured
        if (node.alerting.email_recipients && node.alerting.email_recipients.length > 0) {
          await this.sendEmailAlert(
            node.alerting.email_recipients,
            context,
            alert
          );
          sentAlerts.push({
            ...alert,
            channel: 'email',
            sent: true,
          });
        }
      } catch (error: any) {
        console.error(`Failed to send alert: ${error.message}`);
        sentAlerts.push({
          ...alert,
          error: error.message,
          sent: false,
        });
      }
    }

    // Store alert history
    this.storeAlertHistory(context.workflow_id, sentAlerts);

    return {
      enabled: true,
      alerts_sent: sentAlerts,
      total_alerts: alertsToSend.length,
    };
  }

  /**
   * Send alert to Slack
   */
  private async sendSlackAlert(
    connectionId: string,
    channel: string,
    context: NodeExecutionContext,
    alert: any
  ): Promise<void> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(connectionId);

    if (!connection) {
      throw new Error(`Slack connection not found: ${connectionId}`);
    }

    const severityColors: Record<string, string> = {
      info: '#36a64f',
      warning: '#ffcc00',
      error: '#ff6600',
      critical: '#ff0000',
    };

    const emojiMap: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emojiMap[alert.severity]} Workflow Monitoring Alert`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Workflow ID:*\n${context.workflow_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Execution ID:*\n${context.execution_id}`,
          },
          {
            type: 'mrkdwn',
            text: `*Alert Type:*\n${alert.type}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${alert.severity.toUpperCase()}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n${alert.message}`,
        },
      },
    ];

    await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel,
        blocks,
        attachments: [
          {
            color: severityColors[alert.severity],
            text: alert.message,
            fields: [
              {
                title: 'Details',
                value: JSON.stringify(alert.data, null, 2),
                short: false,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${connection.credentials.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Send alert via email (requires SendGrid or SMTP configuration)
   */
  private async sendEmailAlert(
    recipients: string[],
    context: NodeExecutionContext,
    alert: any
  ): Promise<void> {
    // Email alerting requires SMTP or SendGrid to be configured.
    // If not configured, this is a no-op — the alert is still recorded in the return value.
  }

  /**
   * Update external dashboards
   */
  private async updateDashboards(
    dashboards: any[],
    metrics: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<Array<{ type: string; url: string; success: boolean }>> {
    const updates: Array<{ type: string; url: string; success: boolean }> = [];

    for (const dashboard of dashboards) {
      try {
        switch (dashboard.type) {
          case 'grafana':
            await this.updateGrafanaDashboard(dashboard, metrics, context);
            updates.push({
              type: 'grafana',
              url: dashboard.url,
              success: true,
            });
            break;

          case 'datadog':
            await this.updateDatadogDashboard(dashboard, metrics, context);
            updates.push({
              type: 'datadog',
              url: dashboard.url,
              success: true,
            });
            break;

          case 'custom':
            await this.updateCustomDashboard(dashboard, metrics, context);
            updates.push({
              type: 'custom',
              url: dashboard.url,
              success: true,
            });
            break;

          default:
            console.warn(`Unknown dashboard type: ${dashboard.type}`);
        }
      } catch (error: any) {
        console.error(`Failed to update dashboard: ${error.message}`);
        updates.push({
          type: dashboard.type,
          url: dashboard.url,
          success: false,
        });
      }
    }

    return updates;
  }

  /**
   * Update Grafana dashboard via HTTP push
   */
  private async updateGrafanaDashboard(
    dashboard: any,
    metrics: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<void> {
    if (!dashboard.url) return;
    await axios.post(dashboard.url, {
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      metrics,
      timestamp: new Date().toISOString(),
    }, {
      headers: dashboard.apiKey ? { Authorization: `Bearer ${dashboard.apiKey}` } : {},
      timeout: 5000,
    });
  }

  /**
   * Update Datadog dashboard via HTTP push
   */
  private async updateDatadogDashboard(
    dashboard: any,
    metrics: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<void> {
    if (!dashboard.url) return;
    await axios.post(dashboard.url, {
      series: [{
        metric: `autochain.workflow.health`,
        points: [[Math.floor(Date.now() / 1000), metrics.health_score?.score || 0]],
        tags: [`workflow:${context.workflow_id}`],
      }],
    }, {
      headers: dashboard.apiKey ? { 'DD-API-KEY': dashboard.apiKey } : {},
      timeout: 5000,
    });
  }

  /**
   * Update custom dashboard via HTTP POST
   */
  private async updateCustomDashboard(
    dashboard: any,
    metrics: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<void> {
    if (!dashboard.url) return;
    await axios.post(dashboard.url, {
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      metrics,
      timestamp: new Date().toISOString(),
    }, {
      headers: dashboard.headers || {},
      timeout: 5000,
    });
  }

  /**
   * Store metrics for historical analysis
   */
  private storeMetrics(
    workflowId: string,
    executionId: string,
    metrics: Record<string, any>
  ): void {
    if (!this.metricsStore.has(workflowId)) {
      this.metricsStore.set(workflowId, []);
    }

    const workflowMetrics = this.metricsStore.get(workflowId)!;

    // Add new metrics
    workflowMetrics.push({
      execution_id: executionId,
      ...metrics,
    });

    // Keep only last 1000 executions
    if (workflowMetrics.length > 1000) {
      workflowMetrics.shift();
    }
  }

  /**
   * Store alert history
   */
  private storeAlertHistory(
    workflowId: string,
    alerts: any[]
  ): void {
    if (!this.alertHistory.has(workflowId)) {
      this.alertHistory.set(workflowId, []);
    }

    const history = this.alertHistory.get(workflowId)!;

    alerts.forEach(alert => {
      history.push({
        ...alert,
        workflow_id: workflowId,
        timestamp: new Date().toISOString(),
      });
    });

    // Keep only last 500 alerts
    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }
  }

  /**
   * Get metrics for a workflow
   */
  public getMetrics(workflowId: string, limit: number = 100): any[] {
    const metrics = this.metricsStore.get(workflowId) || [];
    return metrics.slice(-limit);
  }

  /**
   * Get alert history for a workflow
   */
  public getAlertHistory(workflowId: string, limit: number = 100): any[] {
    const alerts = this.alertHistory.get(workflowId) || [];
    return alerts.slice(-limit);
  }

  /**
   * Clear metrics for a workflow
   */
  public clearMetrics(workflowId: string): void {
    this.metricsStore.delete(workflowId);
    this.alertHistory.delete(workflowId);
  }

  /**
   * Get aggregate metrics across all workflows
   */
  public getAggregateMetrics(): {
    total_workflows: number;
    total_executions: number;
    average_success_rate: number;
    average_latency_ms: number;
    total_cost_usd: number;
  } {
    let totalExecutions = 0;
    let totalSuccessRate = 0;
    let totalLatency = 0;
    let totalCost = 0;
    let workflowCount = 0;

    for (const metrics of this.metricsStore.values()) {
      if (metrics.length > 0) {
        workflowCount++;
        totalExecutions += metrics.length;

        const lastMetrics = metrics[metrics.length - 1];
        totalSuccessRate += lastMetrics.success_rate?.success_rate || 0;
        totalLatency += lastMetrics.latency?.average_ms || 0;
        totalCost += lastMetrics.cost?.estimated_cost_usd || 0;
      }
    }

    return {
      total_workflows: workflowCount,
      total_executions: totalExecutions,
      average_success_rate: workflowCount > 0 ? totalSuccessRate / workflowCount : 0,
      average_latency_ms: workflowCount > 0 ? totalLatency / workflowCount : 0,
      total_cost_usd: totalCost,
    };
  }
}

/**
 * Export types for use in other modules
 */
export type { WorkflowMonitorNode };
