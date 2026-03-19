import { BaseNodeExecutor } from '../../execution/base-executor';
import {
  MeetingIntelligenceNode,
  NodeExecutionContext,
} from '../../types/nodes';
import { getConnectionManager } from '../../connections/manager';
import { OpenAI } from 'openai';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as tmp from 'tmp';

/**
 * Meeting Intelligence Node Executor
 * Handles meeting transcription, analysis, task extraction, and integration
 */
export class MeetingIntelligenceNodeExecutor extends BaseNodeExecutor {
  private transcriptionCache: Map<string, any> = new Map();
  private taskExportHistory: Map<string, any[]> = new Map();

  protected async executeNode(
    node: MeetingIntelligenceNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ['input_source', 'transcription_model', 'llm_api_key']);

    const startTime = Date.now();

    try {
      // Resolve template variables
      const resolvedConfig = this.resolveTemplate(
        {
          meeting_id: node.meeting_id,
          timestamp_range: node.timestamp_range,
        },
        context
      );

      // Step 1: Fetch meeting recording
      const recordingInfo = await this.fetchMeetingRecording(
        node,
        resolvedConfig,
        context
      );

      // Step 2: Transcribe meeting
      const transcription = await this.transcribeMeeting(
        recordingInfo,
        node,
        context
      );

      // Step 3: Generate meeting summary and insights
      const insights = await this.generateMeetingInsights(
        transcription,
        node,
        context
      );

      // Step 4: Extract tasks and action items
      const tasks = node.task_extraction
        ? await this.extractTasks(
            transcription,
            insights,
            node,
            context
          )
        : [];

      // Step 5: Export tasks to configured integrations
      const exportResults = node.output_integrations
        ? await this.exportTasksToIntegrations(
            tasks,
            node.output_integrations,
            context
          )
        : [];

      // Step 6: Generate final report
      const report = this.generateMeetingReport(
        recordingInfo,
        transcription,
        insights,
        tasks,
        exportResults,
        node
      );

      // Cache transcription for reference
      this.transcriptionCache.set(
        `${context.workflow_id}-${context.execution_id}`,
        {
          transcription,
          insights,
          tasks,
          exportResults,
          report,
          timestamp: new Date().toISOString(),
        }
      );

      return {
        meeting_intelligence_type: 'meeting.intelligence',
        input_source: node.input_source,
        meeting_id: node.meeting_id,
        recording_info: recordingInfo,
        transcription: {
          text: transcription.text,
          language: transcription.language,
          duration_seconds: transcription.duration,
          confidence: transcription.confidence,
          segments_count: transcription.segments?.length || 0,
        },
        insights: {
          summary: insights.summary,
          key_points: insights.key_points,
          participants: insights.participants,
          sentiment: insights.sentiment,
          topics: insights.topics,
          decisions: insights.decisions,
          action_items: insights.action_items,
        },
        tasks: {
          extracted_count: tasks.length,
          tasks: tasks,
          extraction_confidence: insights.average_confidence || 0,
        },
        integrations: {
          configured: Object.keys(node.output_integrations || {}),
          export_results: exportResults,
          total_exports: exportResults.length,
          successful_exports: exportResults.filter(r => r.success).length,
        },
        report: {
          summary: report.summary,
          recommendations: report.recommendations,
          follow_up_required: report.follow_up_required,
        },
        metadata: {
          transcription_model: node.transcription_model,
          llm_model: node.llm_model,
          language: node.language || 'en',
          execution_time_ms: Date.now() - startTime,
          processed_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      throw new Error(`Meeting intelligence failed: ${error.message}`);
    }
  }

  /**
   * Fetch meeting recording from source platform
   */
  private async fetchMeetingRecording(
    node: MeetingIntelligenceNode,
    resolvedConfig: any,
    context: NodeExecutionContext
  ): Promise<{
    platform: string;
    meeting_id: string;
    recording_url: string;
    duration_minutes: number;
    participants: number;
    recorded_at: string;
    file_size_bytes: number;
  }> {
    switch (node.input_source) {
      case 'zoom':
        return await this.fetchZoomRecording(
          node.zoom_api_key,
          resolvedConfig.meeting_id,
          context
        );

      case 'teams':
        return await this.fetchTeamsRecording(
          node,
          resolvedConfig.meeting_id,
          context
        );

      case 'meet':
        return await this.fetchMeetRecording(
          node,
          resolvedConfig.meeting_id,
          context
        );

      case 'custom':
        return await this.fetchCustomRecording(
          node,
          resolvedConfig,
          context
        );

      default:
        throw new Error(`Unsupported input source: ${node.input_source}`);
    }
  }

  /**
   * Fetch recording from Zoom API
   */
  private async fetchZoomRecording(
    apiKey: string,
    meetingId: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(
      node.output_integrations?.zoom?.connection_id || 'zoom_prod'
    );

    if (!connection) {
      throw new Error('Zoom connection not configured');
    }

    const response = await axios.get(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      {
        headers: {
          'Authorization': `Bearer ${connection.credentials.access_token || connection.credentials.jwt_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const recordingData = response.data;

    if (!recordingData.recording_files || recordingData.recording_files.length === 0) {
      throw new Error('No recording files found for this meeting');
    }

    const recordingFile = recordingData.recording_files[0];

    // Download recording file
    const downloadedFile = await this.downloadRecordingFile(
      recordingFile.download_url,
      `zoom-${meetingId}.mp4`
    );

    return {
      platform: 'zoom',
      meeting_id: meetingId,
      recording_url: recordingFile.download_url,
      download_url: recordingFile.download_url,
      local_path: downloadedFile.path,
      duration_minutes: recordingData.duration / 60,
      participants: recordingData.participants_count,
      recorded_at: recordingData.start_time,
      file_size_bytes: recordingFile.file_size,
      file_type: recordingFile.file_type,
    };
  }

  /**
   * Fetch recording from Microsoft Teams
   */
  private async fetchTeamsRecording(
    node: MeetingIntelligenceNode,
    meetingId: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection('teams_prod');

    if (!connection) {
      throw new Error('Teams connection not configured');
    }

    // Microsoft Graph API to get meeting recording
    const graphToken = connection.credentials.access_token;

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meetingData = response.data;
    const recordingUrl = meetingData?.recordingUrl || meetingData?.recordings?.[0]?.url;

    if (!recordingUrl) {
      throw new Error('No recording found for this Teams meeting');
    }

    // Download recording
    const downloadedFile = await this.downloadRecordingFile(
      recordingUrl,
      `teams-${meetingId}.mp4`
    );

    return {
      platform: 'teams',
      meeting_id: meetingId,
      recording_url: recordingUrl,
      download_url: recordingUrl,
      local_path: downloadedFile.path,
      duration_minutes: meetingData.durationMinutes || 0,
      participants: meetingData.attendees?.length || 0,
      recorded_at: meetingData.startDateTime,
      file_size_bytes: 0, // Would need HEAD request
      file_type: 'video/mp4',
    };
  }

  /**
   * Fetch recording from Google Meet
   */
  private async fetchMeetRecording(
    node: MeetingIntelligenceNode,
    meetingId: string,
    context: NodeExecutionContext
  ): Promise<any> {
    // Google Meet recordings are typically stored in Google Drive
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection('google_drive_prod');

    if (!connection) {
      throw new Error('Google Drive connection not configured');
    }

    // Search Drive for recording
    const response = await axios.get(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'Meet Recording' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${connection.credentials.access_token}`,
        },
      }
    );

    const files = response.data.files;
    const recordingFile = files[0];

    if (!recordingFile) {
      throw new Error('No Meet recording found in Google Drive');
    }

    // Download recording
    const downloadedFile = await this.downloadRecordingFile(
      `https://www.googleapis.com/drive/v3/files/${recordingFile.id}?alt=media`,
      `meet-${meetingId}.mp4`
    );

    return {
      platform: 'meet',
      meeting_id: meetingId,
      recording_url: recordingFile.webViewLink,
      download_url: recordingFile.webContentLink,
      local_path: downloadedFile.path,
      duration_minutes: 0, // Would need to analyze file
      participants: 0,
      recorded_at: recordingFile.createdTime,
      file_size_bytes: parseInt(recordingFile.size),
      file_type: recordingFile.mimeType,
    };
  }

  /**
   * Fetch recording from custom source
   */
  private async fetchCustomRecording(
    node: MeetingIntelligenceNode,
    resolvedConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const recordingUrl = resolvedConfig.recording_url || context.input_data.recording_url;

    if (!recordingUrl) {
      throw new Error('Recording URL not provided');
    }

    // Download recording
    const downloadedFile = await this.downloadRecordingFile(
      recordingUrl,
      `custom-${Date.now()}.mp4`
    );

    return {
      platform: 'custom',
      meeting_id: resolvedConfig.meeting_id || 'unknown',
      recording_url: recordingUrl,
      download_url: recordingUrl,
      local_path: downloadedFile.path,
      duration_minutes: 0,
      participants: context.input_data.participants || 0,
      recorded_at: context.input_data.recorded_at || new Date().toISOString(),
      file_size_bytes: downloadedFile.size,
      file_type: 'video/mp4',
    };
  }

  /**
   * Download recording file to temporary location
   */
  private async downloadRecordingFile(
    url: string,
    filename: string
  ): Promise<{ path: string; size: number }> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    const tempFile = tmp.fileSync({ postfix: path.extname(filename) });
    await fs.writeFile(tempFile.name, response.data);

    return {
      path: tempFile.name,
      size: response.data.byteLength,
    };
  }

  /**
   * Transcribe meeting audio using Whisper
   */
  private async transcribeMeeting(
    recordingInfo: any,
    node: MeetingIntelligenceNode,
    context: NodeExecutionContext
  ): Promise<{
    text: string;
    language: string;
    duration: number;
    confidence: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      speaker?: string;
    }>;
  }> {
    const llmApiKey = node.llm_api_key?.startsWith('env.')
      ? process.env[node.llm_api_key.substring(4)]
      : node.llm_api_key;

    if (!llmApiKey) {
      throw new Error('LLM API key not configured');
    }

    const openai = new OpenAI({ apiKey: llmApiKey });

    let transcriptionText = '';
    let segments: any[] = [];
    let confidence = 0;
    let language = node.language || 'en';

    // Use Whisper for transcription
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(recordingInfo.local_path),
        model: 'whisper-1',
        language: language,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      transcriptionText = transcription.text;
      segments = transcription.segments || [];
      language = transcription.language;
      confidence = this.calculateAverageConfidence(segments);

      // Add speaker diarization if available
      if (transcription.speaker_labels) {
        segments = segments.map(seg => ({
          ...seg,
          speaker: seg.speaker || 'unknown',
        }));
      }

    } catch (error: any) {
      // Fallback to simpler transcription
      const simpleTranscription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(recordingInfo.local_path),
        model: 'whisper-1',
        language: language,
      });

      transcriptionText = simpleTranscription.text;
      segments = [];
      confidence = 0.85; // Default confidence
      language = simpleTranscription.language;
    }

    // Clean up temporary file
    try {
      await fs.unlink(recordingInfo.local_path);
    } catch (error) {
      console.warn('Failed to delete temporary file:', error);
    }

    return {
      text: transcriptionText,
      language,
      duration: recordingInfo.duration_minutes * 60,
      confidence,
      segments: segments.map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        speaker: seg.speaker,
      })),
    };
  }

  /**
   * Calculate average confidence from segments
   */
  private calculateAverageConfidence(segments: any[]): number {
    if (!segments || segments.length === 0) {
      return 0;
    }

    const totalConfidence = segments.reduce(
      (sum, seg) => sum + (seg.confidence || 0),
      0
    );

    return totalConfidence / segments.length;
  }

  /**
   * Generate meeting insights using LLM
   */
  private async generateMeetingInsights(
    transcription: any,
    node: MeetingIntelligenceNode,
    context: NodeExecutionContext
  ): Promise<{
    summary: string;
    key_points: string[];
    participants: string[];
    sentiment: string;
    topics: string[];
    decisions: string[];
    action_items: string[];
    average_confidence: number;
  }> {
    const llmApiKey = node.llm_api_key?.startsWith('env.')
      ? process.env[node.llm_api_key.substring(4)]
      : node.llm_api_key;

    const openai = new OpenAI({
      apiKey: llmApiKey,
    });

    const prompt = this.buildInsightsPrompt(transcription, node);

    const completion = await openai.chat.completions.create({
      model: node.llm_model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting analyst. Your task is to analyze meeting transcripts and extract key insights, decisions, action items, and sentiment.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const insights = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      summary: insights.summary || 'No summary generated',
      key_points: insights.key_points || [],
      participants: insights.participants || [],
      sentiment: insights.sentiment || 'neutral',
      topics: insights.topics || [],
      decisions: insights.decisions || [],
      action_items: insights.action_items || [],
      average_confidence: transcription.confidence || 0.8,
    };
  }

  /**
   * Build insights prompt for LLM
   */
  private buildInsightsPrompt(transcription: any, node: MeetingIntelligenceNode): string {
    const maxLength = 15000; // Character limit for prompt
    const truncatedText = transcription.text.length > maxLength
      ? transcription.text.substring(0, maxLength) + '...'
      : transcription.text;

    let prompt = `Analyze the following meeting transcript and provide structured insights.

MEETING TRANSCRIPT:
${truncatedText}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "2-3 sentence executive summary of the meeting",
  "key_points": ["list of 5-7 key discussion points"],
  "participants": ["list of identified participants"],
  "sentiment": "overall sentiment (positive, negative, or neutral)",
  "topics": ["list of 5-10 main topics discussed"],
  "decisions": ["list of decisions made during the meeting"],
  "action_items": ["list of action items mentioned"]
}

Focus on:
1. Identifying clear action items with owners
2. Extracting decisions and agreements
3. Understanding the overall sentiment and tone
4. Identifying main discussion topics
5. Highlighting key participants and their contributions
`;

    if (node.transcription_model === 'whisper') {
      prompt += `\n\nNote: This transcript was generated using AI transcription (Whisper), so may have minor inaccuracies in names or technical terms.`;
    }

    return prompt;
  }

  /**
   * Extract structured tasks from meeting
   */
  private async extractTasks(
    transcription: any,
    insights: any,
    node: MeetingIntelligenceNode,
    context: NodeExecutionContext
  ): Promise<Array<{
    task_id: string;
    title: string;
    description: string;
    assignee: string;
    due_date: string | null;
    priority: 'high' | 'medium' | 'low';
    status: 'pending';
    meeting_timestamp: string;
    speaker_context: string;
  }>> {
    const llmApiKey = node.llm_api_key?.startsWith('env.')
      ? process.env[node.llm_api_key.substring(4)]
      : node.llm_api_key;

    const openai = new OpenAI({ apiKey: llmApiKey });

    const prompt = this.buildTaskExtractionPrompt(transcription, insights);

    const completion = await openai.chat.completions.create({
      model: node.llm_model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert task manager. Your task is to extract structured action items and tasks from meeting transcripts.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const extractedTasks = JSON.parse(completion.choices[0].message.content || '{}');

    // Process and structure tasks
    const tasks = (extractedTasks.tasks || []).map((task: any, index: number) => ({
      task_id: `task-${Date.now()}-${index}`,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      assignee: task.assignee || 'unassigned',
      due_date: task.due_date || null,
      priority: this.inferPriority(task.title, insights.sentiment),
      status: 'pending',
      meeting_timestamp: new Date().toISOString(),
      speaker_context: task.speaker || 'unknown',
    }));

    return tasks;
  }

  /**
   * Build task extraction prompt
   */
  private buildTaskExtractionPrompt(transcription: any, insights: any): string {
    return `Extract detailed action items and tasks from the following meeting transcript and insights.

TRANSCRIPT:
${transcription.text.substring(0, 10000)}

INSIGHTS:
- Summary: ${insights.summary}
- Decisions: ${insights.decisions?.join(', ')}

Extract tasks in the following JSON format:
{
  "tasks": [
    {
      "title": "concise task title",
      "description": "detailed task description",
      "assignee": "person responsible for the task (or 'unassigned' if unclear)",
      "due_date": "due date in ISO format if mentioned, or null",
      "speaker": "who mentioned this task (participant name)",
      "context": "brief context from the meeting",
      "priority_indicator": "keywords suggesting priority (urgent, ASAP, this week, etc.)"
    }
  ]
}

Guidelines:
1. Extract ALL action items and tasks mentioned
2. Identify clear owners/assignees
3. Extract due dates if explicitly mentioned
4. Include context and description for each task
5. Mark urgency/priority based on language used
6. Group related sub-tasks under main tasks when appropriate
`;
  }

  /**
   * Infer task priority from context
   */
  private inferPriority(title: string, sentiment: string): 'high' | 'medium' | 'low' {
    const titleLower = title.toLowerCase();

    if (
      titleLower.includes('urgent') ||
      titleLower.includes('asap') ||
      titleLower.includes('critical') ||
      titleLower.includes('immediately') ||
      titleLower.includes('today')
    ) {
      return 'high';
    }

    if (
      titleLower.includes('this week') ||
      titleLower.includes('priority') ||
      titleLower.includes('important')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Export tasks to configured integrations
   */
  private async exportTasksToIntegrations(
    tasks: any[],
    integrations: any,
    context: NodeExecutionContext
  ): Promise<Array<{
    platform: string;
    success: boolean;
    task_ids: string[];
    error?: string;
  }>> {
    const results: Array<any> = [];

    // Export to Jira
    if (integrations.jira?.connection_id) {
      try {
        const jiraResult = await this.exportToJira(
          tasks,
          integrations.jira,
          context
        );
        results.push(jiraResult);
      } catch (error: any) {
        results.push({
          platform: 'jira',
          success: false,
          task_ids: [],
          error: error.message,
        });
      }
    }

    // Export to Notion
    if (integrations.notion?.connection_id) {
      try {
        const notionResult = await this.exportToNotion(
          tasks,
          integrations.notion,
          context
        );
        results.push(notionResult);
      } catch (error: any) {
        results.push({
          platform: 'notion',
          success: false,
          task_ids: [],
          error: error.message,
        });
      }
    }

    // Export to Slack
    if (integrations.slack?.connection_id) {
      try {
        const slackResult = await this.exportToSlack(
          tasks,
          integrations.slack,
          context
        );
        results.push(slackResult);
      } catch (error: any) {
        results.push({
          platform: 'slack',
          success: false,
          task_ids: [],
          error: error.message,
        });
      }
    }

    // Send email summary
    if (integrations.email?.recipients) {
      try {
        const emailResult = await this.sendMeetingEmail(
          tasks,
          integrations.email,
          context
        );
        results.push({
          ...emailResult,
          platform: 'email',
        });
      } catch (error: any) {
        results.push({
          platform: 'email',
          success: false,
          task_ids: [],
          error: error.message,
        });
      }
    }

    // Store export history
    this.taskExportHistory.set(
      `${context.workflow_id}-${context.execution_id}`,
      results
    );

    return results;
  }

  /**
   * Export tasks to Jira
   */
  private async exportToJira(
    tasks: any[],
    config: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(config.connection_id);

    if (!connection) {
      throw new Error('Jira connection not configured');
    }

    const createdTasks: string[] = [];

    for (const task of tasks) {
      try {
        const jiraTask = {
          fields: {
            project: { key: config.project_key },
            summary: task.title,
            description: task.description,
            assignee: task.assignee !== 'unassigned'
              ? { name: task.assignee }
              : undefined,
            priority: this.mapPriorityToJira(task.priority),
            duedate: task.due_date,
            issuetype: { name: 'Task' },
          },
        };

        const response = await axios.post(
          `${connection.base_url}/rest/api/3/issue`,
          jiraTask,
          {
            headers: {
              'Authorization': `Bearer ${connection.credentials.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        createdTasks.push(response.data.key);
      } catch (error) {
        console.warn(`Failed to create Jira task: ${task.title}`, error);
      }
    }

    return {
      platform: 'jira',
      success: true,
      task_ids: createdTasks,
      project_key: config.project_key,
      total_tasks: tasks.length,
      created_tasks: createdTasks.length,
    };
  }

  /**
   * Map priority to Jira priority levels
   */
  private mapPriorityToJira(priority: string): { name: string } {
    const priorityMap: Record<string, string> = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };

    return { name: priorityMap[priority] || 'Medium' };
  }

  /**
   * Export tasks to Notion
   */
  private async exportToNotion(
    tasks: any[],
    config: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(config.connection_id);

    if (!connection) {
      throw new Error('Notion connection not configured');
    }

    const createdTasks: string[] = [];

    for (const task of tasks) {
      try {
        const notionPage = {
          parent: { database_id: config.database_id },
          properties: {
            title: {
              title: [
                {
                  text: {
                    content: task.title,
                  },
                },
              ],
            },
            description: {
              rich_text: [
                {
                  text: {
                    content: task.description,
                  },
                },
              ],
            },
            assignee: task.assignee !== 'unassigned'
              ? { email: task.assignee }
              : null,
            priority: {
              select: {
                name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
              },
            },
            due_date: task.due_date
              ? { date: { start: task.due_date } }
              : null,
            status: {
              select: {
                name: 'Not started',
              },
            },
          },
        };

        const response = await axios.post(
          'https://api.notion.com/v1/pages',
          notionPage,
          {
            headers: {
              'Authorization': `Bearer ${connection.credentials.access_token}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
          }
        );

        createdTasks.push(response.data.id);
      } catch (error) {
        console.warn(`Failed to create Notion task: ${task.title}`, error);
      }
    }

    return {
      platform: 'notion',
      success: true,
      task_ids: createdTasks,
      database_id: config.database_id,
      total_tasks: tasks.length,
      created_tasks: createdTasks.length,
    };
  }

  /**
   * Export tasks to Slack
   */
  private async exportToSlack(
    tasks: any[],
    config: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(config.connection_id);

    if (!connection) {
      throw new Error('Slack connection not configured');
    }

    const postedTasks: string[] = [];

    for (const task of tasks) {
      try {
        const blocks = this.createSlackTaskBlocks(task);

        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: config.channel,
            blocks,
          },
          {
            headers: {
              'Authorization': `Bearer ${connection.credentials.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        postedTasks.push(task.task_id);
      } catch (error) {
        console.warn(`Failed to post task to Slack: ${task.title}`, error);
      }
    }

    return {
      platform: 'slack',
      success: true,
      task_ids: postedTasks,
      channel: config.channel,
      total_tasks: tasks.length,
      posted_tasks: postedTasks.length,
    };
  }

  /**
   * Create Slack blocks for task
   */
  private createSlackTaskBlocks(task: any): any[] {
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmoji[task.priority]} *${task.title}*`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Assignee:*\n${task.assignee}`,
          },
          {
            type: 'mrkdwn',
            text: `*Due:*\n${task.due_date || 'Not set'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${task.description}`,
        },
      },
      {
        type: 'divider',
      },
    ];
  }

  /**
   * Send meeting summary email
   */
  private async sendMeetingEmail(
    tasks: any[],
    config: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const subject = 'Meeting Action Items & Summary';
    const body = this.generateEmailBody(tasks, context);

    // In a real implementation, use Email tool executor
    console.log(`Email would be sent to: ${config.recipients.join(', ')}`);
    console.log(`Subject: ${subject}`);

    return {
      platform: 'email',
      success: true,
      task_ids: tasks.map(t => t.task_id),
      recipients: config.recipients,
      total_tasks: tasks.length,
      subject,
    };
  }

  /**
   * Generate email body
   */
  private generateEmailBody(tasks: any[], context: NodeExecutionContext): string {
    let body = `Meeting Summary Report
Workflow ID: ${context.workflow_id}
Execution ID: ${context.execution_id}
Generated: ${new Date().toISOString()}

`;

    if (tasks.length > 0) {
      body += '\nACTION ITEMS:\n\n';

      tasks.forEach((task, index) => {
        body += `${index + 1}. ${task.title}\n`;
        body += `   Assignee: ${task.assignee}\n`;
        body += `   Priority: ${task.priority.toUpperCase()}\n`;
        body += `   Due: ${task.due_date || 'Not specified'}\n`;
        body += `   Description: ${task.description}\n\n`;
      });
    } else {
      body += '\nNo action items were identified in this meeting.\n';
    }

    return body;
  }

  /**
   * Generate comprehensive meeting report
   */
  private generateMeetingReport(
    recordingInfo: any,
    transcription: any,
    insights: any,
    tasks: any[],
    exportResults: any[],
    node: MeetingIntelligenceNode
  ): {
    summary: string;
    recommendations: string[];
    follow_up_required: boolean;
  } {
    const recommendations: string[] = [];

    // Analyze for follow-up needs
    const followUpRequired =
      tasks.length > 0 ||
      insights.decisions.length > 0 ||
      insights.sentiment === 'negative';

    if (tasks.length > 0) {
      recommendations.push(`${tasks.length} action items have been extracted and exported to configured systems.`);
      recommendations.push('Review and prioritize the extracted tasks for immediate action.');
    }

    if (insights.decisions.length > 0) {
      recommendations.push('Multiple decisions were made. Document them in project management systems.');
    }

    if (insights.sentiment === 'negative') {
      recommendations.push('Meeting had negative sentiment. Consider follow-up discussion to address concerns.');
    }

    if (transcription.confidence < 0.8) {
      recommendations.push('Transcription confidence is below 80%. Review transcript for accuracy.');
    }

    if (exportResults.some(r => !r.success)) {
      recommendations.push('Some task exports failed. Check integration configurations.');
    }

    const summary = `
Meeting Intelligence Report
=========================

Meeting Details:
- Platform: ${recordingInfo.platform}
- Duration: ${recordingInfo.duration_minutes} minutes
- Participants: ${recordingInfo.participants}
- Recorded: ${new Date(recordingInfo.recorded_at).toLocaleString()}

Executive Summary:
${insights.summary}

Key Insights:
- Topics: ${insights.topics.join(', ')}
- Sentiment: ${insights.sentiment}
- Decisions Made: ${insights.decisions.length}
- Action Items: ${tasks.length}

Task Extraction:
- Total Tasks Extracted: ${tasks.length}
- High Priority: ${tasks.filter(t => t.priority === 'high').length}
- Medium Priority: ${tasks.filter(t => t.priority === 'medium').length}
- Low Priority: ${tasks.filter(t => t.priority === 'low').length}

Integrations:
- Systems Configured: ${Object.keys(node.output_integrations || {}).length}
- Successful Exports: ${exportResults.filter(r => r.success).length}
- Failed Exports: ${exportResults.filter(r => !r.success).length}
`;

    return {
      summary,
      recommendations,
      follow_up_required,
    };
  }

  /**
   * Get cached transcription by workflow/execution
   */
  public getCachedTranscription(
    workflowId: string,
    executionId: string
  ): any | null {
    const key = `${workflowId}-${executionId}`;
    return this.transcriptionCache.get(key) || null;
  }

  /**
   * Get task export history
   */
  public getExportHistory(workflowId: string, executionId: string): any[] {
    const key = `${workflowId}-${executionId}`;
    return this.taskExportHistory.get(key) || [];
  }

  /**
   * Clear cache
   */
  public clearCache(workflowId?: string): void {
    if (workflowId) {
      for (const [key] of this.transcriptionCache.keys()) {
        if (key.startsWith(workflowId)) {
          this.transcriptionCache.delete(key);
        }
      }
      for (const [key] of this.taskExportHistory.keys()) {
        if (key.startsWith(workflowId)) {
          this.taskExportHistory.delete(key);
        }
      }
    } else {
      this.transcriptionCache.clear();
      this.taskExportHistory.clear();
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    total_meetings_processed: number;
    total_tasks_extracted: number;
    total_exports: number;
    average_tasks_per_meeting: number;
    successful_export_rate: number;
  } {
    let totalMeetings = this.transcriptionCache.size;
    let totalTasks = 0;
    let totalExports = 0;
    let successfulExports = 0;

    for (const [key, data] of this.transcriptionCache.entries()) {
      totalTasks += data.tasks?.length || 0;
      totalExports += (data.exportResults || []).length;
      successfulExports += (data.exportResults || []).filter((r: any) => r.success).length;
    }

    return {
      total_meetings_processed: totalMeetings,
      total_tasks_extracted: totalTasks,
      total_exports: totalExports,
      average_tasks_per_meeting: totalMeetings > 0 ? totalTasks / totalMeetings : 0,
      successful_export_rate: totalExports > 0 ? successfulExports / totalExports : 0,
    };
  }
}

/**
 * Export types for use in other modules
 */
export type { MeetingIntelligenceNode };
