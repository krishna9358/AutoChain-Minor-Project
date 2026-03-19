import { BaseNodeExecutor } from '../../execution/base-executor';
import {
  HumanApprovalNode,
  NodeExecutionContext,
} from '../../types/nodes';
import { getConnectionManager } from '../../connections/manager';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Human Approval Node Executor
 * Handles manual approval steps in workflows with UI forms and notifications
 */
export class HumanApprovalNodeExecutor extends BaseNodeExecutor {
  private approvalStore: Map<string, ApprovalRecord> = new Map();
  private notificationSent: Set<string> = new Set();
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map();

  protected async executeNode(
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ['assigned_to', 'ui_form']);

    const approvalId = `${context.execution_id}-${node.node_id}`;

    // Resolve template variables
    const resolvedAssignees = this.resolveTemplate(node.assigned_to, context);
    const resolvedContext = node.context
      ? this.resolveTemplate(node.context, context)
      : {};

    // Check if approval already exists
    const existingApproval = this.approvalStore.get(approvalId);
    if (existingApproval) {
      return this.handleExistingApproval(existingApproval, node, context);
    }

    // Create new approval request
    const approvalRecord = await this.createApprovalRequest(
      approvalId,
      node,
      resolvedAssignees,
      resolvedContext,
      context
    );

    // Send notifications if enabled
    let notificationResult: any = null;
    if (node.notification?.enabled) {
      notificationResult = await this.sendApprovalNotifications(
        approvalRecord,
        node,
        context
      );
    }

    // Store approval record
    this.approvalStore.set(approvalId, approvalRecord);
    this.notificationSent.add(approvalId);

    // Set timeout handler
    this.setupTimeoutHandler(approvalId, node, context);

    return {
      approval_type: 'human.approval',
      approval_id: approvalId,
      status: approvalRecord.status,
      assigned_to: resolvedAssignees,
      ui_form: node.ui_form,
      context: resolvedContext,
      timeout: node.timeout,
      fallback: node.fallback,
      notification: notificationResult,
      approval_url: approvalRecord.approval_url,
      metadata: {
        created_at: approvalRecord.created_at,
        expires_at: approvalRecord.expires_at,
        workflow_id: context.workflow_id,
        execution_id: context.execution_id,
        node_id: node.node_id,
      },
    };
  }

  /**
   * Create approval request record
   */
  private async createApprovalRequest(
    approvalId: string,
    node: HumanApprovalNode,
    assignees: string | string[],
    contextData: any,
    context: NodeExecutionContext
  ): Promise<ApprovalRecord> {
    const assigneesArray = Array.isArray(assignees) ? assignees : [assignees];
    const expiresAt = new Date(Date.now() + (node.timeout || 86400) * 1000);

    const approvalRecord: ApprovalRecord = {
      approval_id: approvalId,
      workflow_id: context.workflow_id,
      execution_id: context.execution_id,
      node_id: node.node_id,
      status: 'pending',
      assigned_to: assigneesArray,
      ui_form: node.ui_form,
      context: contextData,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      completed_at: null,
      decision: null,
      decision_comments: null,
      approver: null,
      approval_history: node.approval_history || [],
      fallback: node.fallback,
      fallback_node: node.fallback_node,
      approval_url: this.generateApprovalUrl(approvalId),
    };

    return approvalRecord;
  }

  /**
   * Generate approval URL for UI
   */
  private generateApprovalUrl(approvalId: string): string {
    const baseUrl = process.env.APPROVAL_UI_URL || 'http://localhost:3000';
    return `${baseUrl}/approvals/${approvalId}`;
  }

  /**
   * Handle existing approval
   */
  private async handleExistingApproval(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    const now = new Date();
    const expiresAt = new Date(approvalRecord.expires_at);

    // Check if approval has expired
    if (now > expiresAt) {
      await this.handleApprovalTimeout(approvalRecord.approval_id, node, context);
      throw new Error(`Approval request has expired at ${approvalRecord.expires_at}`);
    }

    // Check if already completed
    if (approvalRecord.status === 'approved' || approvalRecord.status === 'rejected') {
      return {
        approval_type: 'human.approval',
        approval_id: approvalRecord.approval_id,
        status: approvalRecord.status,
        decision: approvalRecord.decision,
        decision_comments: approvalRecord.decision_comments,
        approver: approvalRecord.approver,
        completed_at: approvalRecord.completed_at,
        already_completed: true,
        metadata: {
          workflow_id: context.workflow_id,
          execution_id: context.execution_id,
        },
      };
    }

    // Still pending
    return {
      approval_type: 'human.approval',
      approval_id: approvalRecord.approval_id,
      status: 'pending',
      approval_url: approvalRecord.approval_url,
      waiting_for_approval: true,
      metadata: {
        created_at: approvalRecord.created_at,
        expires_at: approvalRecord.expires_at,
      },
    };
  }

  /**
   * Send approval notifications
   */
  private async sendApprovalNotifications(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    const results: any[] = [];
    const notificationConfig = node.notification;

    // Send email notifications
    if (notificationConfig?.email) {
      try {
        const emailResult = await this.sendEmailNotification(
          approvalRecord,
          node,
          context
        );
        results.push({
          type: 'email',
          success: true,
          sent_to: approvalRecord.assigned_to,
          result: emailResult,
        });
      } catch (error: any) {
        results.push({
          type: 'email',
          success: false,
          error: error.message,
        });
      }
    }

    // Send Slack notifications
    if (notificationConfig?.slack_connection_id && notificationConfig?.slack_channel) {
      try {
        const slackResult = await this.sendSlackNotification(
          approvalRecord,
          node,
          context
        );
        results.push({
          type: 'slack',
          success: true,
          channel: notificationConfig.slack_channel,
          result: slackResult,
        });
      } catch (error: any) {
        results.push({
          type: 'slack',
          success: false,
          error: error.message,
        });
      }
    }

    // Send in-app notifications
    if (notificationConfig?.in_app) {
      try {
        const inAppResult = await this.sendInAppNotification(
          approvalRecord,
          node,
          context
        );
        results.push({
          type: 'in_app',
          success: true,
          result: inAppResult,
        });
      } catch (error: any) {
        results.push({
          type: 'in_app',
          success: false,
          error: error.message,
        });
      }
    }

    return {
      enabled: true,
      channels_sent: results.length,
      results,
    };
  }

  /**
   * Send email notification for approval
   */
  private async sendEmailNotification(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    // In a real implementation, this would use the Email tool executor
    const subject = `Approval Required: Workflow ${context.workflow_id}`;
    const body = this.generateEmailBody(approvalRecord, node, context);

    console.log(`Email notification would be sent to: ${approvalRecord.assigned_to.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Approval URL: ${approvalRecord.approval_url}`);

    return {
      subject,
      recipients: approvalRecord.assigned_to,
      approval_url: approvalRecord.approval_url,
      sent_at: new Date().toISOString(),
    };
  }

  /**
   * Generate email body
   */
  private generateEmailBody(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): string {
    const assigneeNames = approvalRecord.assigned_to.join(', ');
    const deadline = new Date(approvalRecord.expires_at).toLocaleString();

    let body = `
Hello,

You have been assigned to approve a workflow execution.

Workflow ID: ${context.workflow_id}
Execution ID: ${context.execution_id}

`;

    if (node.ui_form.description) {
      body += `Description: ${node.ui_form.description}\n\n`;
    }

    body += `Please review and approve this request by: ${deadline}

`;

    body += `To approve or reject, please visit:
${approvalRecord.approval_url}

`;

    body += `If you have any questions, please contact your workflow administrator.

Best regards,
Workflow Automation System
`;

    return body.trim();
  }

  /**
   * Send Slack notification for approval
   */
  private async sendSlackNotification(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(
      node.notification?.slack_connection_id || ''
    );

    if (!connection) {
      throw new Error('Slack connection not configured for notifications');
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '👋 Approval Required',
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
        ],
      },
    ];

    if (node.ui_form.title) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${node.ui_form.title}*`,
          emoji: true,
        },
      });
    }

    if (node.ui_form.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: node.ui_form.description,
          emoji: true,
        },
      });
    }

    const deadline = new Date(approvalRecord.expires_at).toLocaleString();
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📅 *Deadline:* ${deadline}`,
        emoji: true,
      },
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `👥 *Assigned to:* ${approvalRecord.assigned_to.join(', ')}`,
        emoji: true,
      },
    });

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Review & Approve',
            emoji: true,
          },
          url: approvalRecord.approval_url,
          style: 'primary',
        },
      ],
    } as any);

    const channel = node.notification?.slack_channel || '#approvals';

    await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel,
        blocks,
      },
      {
        headers: {
          'Authorization': `Bearer ${connection.credentials.access_token || connection.credentials.api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      channel,
      message_sent: true,
      sent_at: new Date().toISOString(),
    };
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<any> {
    // In a real implementation, this would store notifications in a database
    console.log(`In-app notification created for: ${approvalRecord.assigned_to.join(', ')}`);

    return {
      notification_id: uuidv4(),
      recipients: approvalRecord.assigned_to,
      type: 'approval_request',
      title: node.ui_form.title || 'Workflow Approval Required',
      message: node.ui_form.description || 'Please review and approve this workflow execution',
      approval_url: approvalRecord.approval_url,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Setup timeout handler for approval
   */
  private setupTimeoutHandler(
    approvalId: string,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): void {
    const timeoutMs = (node.timeout || 86400) * 1000;

    const timer = setTimeout(async () => {
      await this.handleApprovalTimeout(approvalId, node, context);
    }, timeoutMs);

    this.timeoutTimers.set(approvalId, timer);
  }

  /**
   * Handle approval timeout
   */
  private async handleApprovalTimeout(
    approvalId: string,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<void> {
    const approvalRecord = this.approvalStore.get(approvalId);

    if (!approvalRecord || approvalRecord.status !== 'pending') {
      return; // Already handled
    }

    // Update approval record
    approvalRecord.status = 'timeout';
    approvalRecord.completed_at = new Date().toISOString();
    approvalRecord.decision = node.fallback || 'auto_reject';

    // Send timeout notifications
    await this.sendTimeoutNotification(approvalRecord, node, context);

    // Execute fallback if configured
    if (node.fallback_node) {
      await this.executeFallbackNode(node, context, approvalRecord);
    }

    // Clear timeout timer
    const timer = this.timeoutTimers.get(approvalId);
    if (timer) {
      clearTimeout(timer);
      this.timeoutTimers.delete(approvalId);
    }
  }

  /**
   * Send timeout notification
   */
  private async sendTimeoutNotification(
    approvalRecord: ApprovalRecord,
    node: HumanApprovalNode,
    context: NodeExecutionContext
  ): Promise<void> {
    const subject = `Approval Timeout: Workflow ${context.workflow_id}`;
    const message = `The approval request for workflow ${context.workflow_id} has timed out. Fallback action: ${node.fallback}`;

    console.log(`Timeout notification: ${message}`);

    // In a real implementation, send actual notifications
  }

  /**
   * Execute fallback node
   */
  private async executeFallbackNode(
    node: HumanApprovalNode,
    context: NodeExecutionContext,
    approvalRecord: ApprovalRecord
  ): Promise<void> {
    // In a real implementation, this would trigger the fallback node
    console.log(`Executing fallback node: ${node.fallback_node}`);
    console.log(`Fallback decision: ${node.fallback}`);
  }

  /**
   * Process approval decision
   */
  public async processApprovalDecision(
    approvalId: string,
    decision: 'approve' | 'reject' | 'escalate',
    approver: string,
    comments?: string,
    formData?: Record<string, any>
  ): Promise<any> {
    const approvalRecord = this.approvalStore.get(approvalId);

    if (!approvalRecord) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (approvalRecord.status !== 'pending') {
      throw new Error(`Approval is not pending. Current status: ${approvalRecord.status}`);
    }

    // Update approval record
    approvalRecord.status = decision === 'approve' ? 'approved' : 'rejected';
    approvalRecord.decision = decision;
    approvalRecord.approver = approver;
    approvalRecord.decision_comments = comments || null;
    approvalRecord.completed_at = new Date().toISOString();

    // Add to approval history
    if (!approvalRecord.approval_history) {
      approvalRecord.approval_history = [];
    }

    approvalRecord.approval_history.push({
      approver,
      decision,
      comments,
      timestamp: new Date().toISOString(),
      form_data: formData,
    });

    // Clear timeout timer
    const timer = this.timeoutTimers.get(approvalId);
    if (timer) {
      clearTimeout(timer);
      this.timeoutTimers.delete(approvalId);
    }

    // Send confirmation notifications
    await this.sendDecisionNotification(approvalRecord, decision);

    return {
      approval_id: approvalId,
      status: approvalRecord.status,
      decision,
      approver,
      comments,
      form_data: formData,
      completed_at: approvalRecord.completed_at,
    };
  }

  /**
   * Send decision notification
   */
  private async sendDecisionNotification(
    approvalRecord: ApprovalRecord,
    decision: string
  ): Promise<void> {
    const message = `Approval ${decision.toUpperCase()}: ${approvalRecord.approval_id}`;
    console.log(`Decision notification: ${message}`);

    // In a real implementation, send actual notifications to assignees and stakeholders
  }

  /**
   * Get approval by ID
   */
  public getApproval(approvalId: string): ApprovalRecord | null {
    return this.approvalStore.get(approvalId) || null;
  }

  /**
   * Get approvals by workflow
   */
  public getWorkflowApprovals(workflowId: string): ApprovalRecord[] {
    const approvals: ApprovalRecord[] = [];

    for (const record of this.approvalStore.values()) {
      if (record.workflow_id === workflowId) {
        approvals.push(record);
      }
    }

    return approvals.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get approvals by user
   */
  public getUserApprovals(userEmail: string): ApprovalRecord[] {
    const approvals: ApprovalRecord[] = [];

    for (const record of this.approvalStore.values()) {
      if (record.assigned_to.includes(userEmail)) {
        approvals.push(record);
      }
    }

    return approvals.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get pending approvals
   */
  public getPendingApprovals(): ApprovalRecord[] {
    const pending: ApprovalRecord[] = [];

    for (const record of this.approvalStore.values()) {
      if (record.status === 'pending') {
        // Check if not expired
        const expiresAt = new Date(record.expires_at);
        if (expiresAt > new Date()) {
          pending.push(record);
        }
      }
    }

    return pending.sort((a, b) =>
      new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    );
  }

  /**
   * Cancel approval
   */
  public cancelApproval(
    approvalId: string,
    reason: string,
    cancelledBy: string
  ): boolean {
    const approvalRecord = this.approvalStore.get(approvalId);

    if (!approvalRecord) {
      return false;
    }

    approvalRecord.status = 'cancelled';
    approvalRecord.completed_at = new Date().toISOString();
    approvalRecord.decision_comments = `Cancelled by ${cancelledBy}: ${reason}`;

    // Clear timeout timer
    const timer = this.timeoutTimers.get(approvalId);
    if (timer) {
      clearTimeout(timer);
      this.timeoutTimers.delete(approvalId);
    }

    return true;
  }

  /**
   * Reassign approval
   */
  public reassignApproval(
    approvalId: string,
    newAssignees: string[],
    reassignedBy: string,
    reason: string
  ): boolean {
    const approvalRecord = this.approvalStore.get(approvalId);

    if (!approvalRecord || approvalRecord.status !== 'pending') {
      return false;
    }

    approvalRecord.assigned_to = newAssignees;

    // Add to approval history
    if (!approvalRecord.approval_history) {
      approvalRecord.approval_history = [];
    }

    approvalRecord.approval_history.push({
      approver: reassignedBy,
      decision: 'reassigned',
      comments: `Reassigned to ${newAssignees.join(', ')}: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Escalate approval
   */
  public async escalateApproval(
    approvalId: string,
    escalatedTo: string[],
    reason: string,
    escalatedBy: string
  ): Promise<boolean> {
    const approvalRecord = this.approvalStore.get(approvalId);

    if (!approvalRecord || approvalRecord.status !== 'pending') {
      return false;
    }

    // Update approval record
    approvalRecord.assigned_to = escalatedTo;
    approvalRecord.status = 'escalated';

    // Add to approval history
    if (!approvalRecord.approval_history) {
      approvalRecord.approval_history = [];
    }

    approvalRecord.approval_history.push({
      approver: escalatedBy,
      decision: 'escalate',
      comments: `Escalated to ${escalatedTo.join(', ')}: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    // Send escalation notifications
    await this.sendEscalationNotification(approvalRecord, escalatedTo, reason);

    return true;
  }

  /**
   * Send escalation notification
   */
  private async sendEscalationNotification(
    approvalRecord: ApprovalRecord,
    escalatedTo: string[],
    reason: string
  ): Promise<void> {
    const subject = `Approval Escalation: Workflow ${approvalRecord.workflow_id}`;
    const message = `Approval request has been escalated to ${escalatedTo.join(', ')}. Reason: ${reason}`;

    console.log(`Escalation notification: ${message}`);

    // In a real implementation, send actual notifications
  }

  /**
   * Get approval statistics
   */
  public getApprovalStatistics(): {
    total_approvals: number;
    pending_approvals: number;
    approved_approvals: number;
    rejected_approvals: number;
    timeout_approvals: number;
    average_response_time_hours: number;
  } {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let timeout = 0;
    let totalResponseTimeMs = 0;
    let responseCount = 0;

    for (const record of this.approvalStore.values()) {
      switch (record.status) {
        case 'pending':
          pending++;
          break;
        case 'approved':
          approved++;
          if (record.completed_at) {
            totalResponseTimeMs += new Date(record.completed_at).getTime() - new Date(record.created_at).getTime();
            responseCount++;
          }
          break;
        case 'rejected':
          rejected++;
          if (record.completed_at) {
            totalResponseTimeMs += new Date(record.completed_at).getTime() - new Date(record.created_at).getTime();
            responseCount++;
          }
          break;
        case 'timeout':
          timeout++;
          break;
      }
    }

    const avgResponseTimeHours = responseCount > 0
      ? (totalResponseTimeMs / responseCount) / (1000 * 60 * 60)
      : 0;

    return {
      total_approvals: this.approvalStore.size,
      pending_approvals: pending,
      approved_approvals: approved,
      rejected_approvals: rejected,
      timeout_approvals: timeout,
      average_response_time_hours: parseFloat(avgResponseTimeHours.toFixed(2)),
    };
  }

  /**
   * Clean up expired approvals
   */
  public cleanupExpiredApprovals(): void {
    const now = new Date();
    const expiredApprovals: string[] = [];

    for (const [approvalId, record] of this.approvalStore.entries()) {
      const expiresAt = new Date(record.expires_at);
      if (expiresAt < now && record.status === 'pending') {
        expiredApprovals.push(approvalId);
      }
    }

    for (const approvalId of expiredApprovals) {
      this.approvalStore.delete(approvalId);
      const timer = this.timeoutTimers.get(approvalId);
      if (timer) {
        clearTimeout(timer);
        this.timeoutTimers.delete(approvalId);
      }
    }

    console.log(`Cleaned up ${expiredApprovals.length} expired approvals`);
  }

  /**
   * Clear all approvals
   */
  public clearAllApprovals(): void {
    // Clear all timeout timers
    for (const timer of this.timeoutTimers.values()) {
      clearTimeout(timer);
    }
    this.timeoutTimers.clear();

    this.approvalStore.clear();
    this.notificationSent.clear();
  }
}

/**
 * Approval Record Interface
 */
interface ApprovalRecord {
  approval_id: string;
  workflow_id: string;
  execution_id: string;
  node_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'timeout' | 'cancelled' | 'escalated';
  assigned_to: string[];
  ui_form: any;
  context: any;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  decision: string | null;
  decision_comments: string | null;
  approver: string | null;
  approval_history: any[];
  fallback?: string;
  fallback_node?: string;
  approval_url: string;
}

/**
 * Export types for use in other modules
 */
export type { HumanApprovalNode };
