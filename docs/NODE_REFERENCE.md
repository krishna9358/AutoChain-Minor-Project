# Workflow Node Reference

This guide documents every workflow node: what it does, when to use it, and all available parameters.

## Entry Point (`entry-point`)
Starts a workflow run from manual test run, webhook, API, or schedule.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `triggerMode` | `select` | yes | Trigger source: `manual`, `webhook`, `schedule`, `api`. |
| `webhookPath` | `text` | no | URL path for webhook trigger mode. |
| `cron` | `text` | no | Cron expression for schedule mode. |
| `inputSchema` | `json` | no | Expected payload schema for incoming data. |
| `testRunPlainText` | `textarea` | no | Plain text passed as `triggerData.text` for editor Run. |

## HTTP Request (`http-request`)
Calls external HTTP APIs as part of the workflow.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | `select` | yes | HTTP verb: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. |
| `url` | `url` | yes | Full target URL including protocol. |
| `authType` | `select` | no | Auth mode: `none`, `bearer`, `api-key`, `basic`. |
| `authValue` | `password` | no | Token/key/credential value (supports `{{secrets.*}}`). |
| `headers` | `json` | no | Request headers object. |
| `query` | `json` | no | Query parameter object. |
| `body` | `json` | no | Request body payload for write operations. |
| `timeoutMs` | `number` | no | Request timeout in milliseconds. |
| `retryCount` | `number` | no | Retry attempts on failure. |

## Slack Message (`slack-send`)
Sends a Slack message via incoming webhook or bot token.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `mode` | `select` | yes | Delivery mode: `webhook` or `bot`. |
| `webhookUrl` | `url` | no | Slack incoming webhook URL (webhook mode). |
| `botToken` | `password` | no | Slack bot token (bot mode). |
| `channel` | `text` | yes | Channel (`#name`) or user ID. |
| `message` | `textarea` | yes | Message body; supports `{{variables}}`. |
| `username` | `text` | no | Display username override. |
| `iconEmoji` | `text` | no | Emoji avatar override (for example `:robot_face:`). |

## Send Email (`email-send`)
Sends transactional or notification emails through selected provider.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `provider` | `select` | yes | Provider: `smtp`, `sendgrid`, `mailgun`, `ses`. |
| `apiKey` | `password` | no | Provider API key or SMTP password. |
| `smtpHost` | `text` | no | SMTP hostname (SMTP provider only). |
| `smtpPort` | `number` | no | SMTP port (SMTP provider only). |
| `from` | `email` | yes | Sender email address. |
| `to` | `text` | yes | Comma-separated recipient list. |
| `subject` | `text` | yes | Subject line; supports templates. |
| `body` | `textarea` | yes | Email body; supports templates. |
| `isHtml` | `boolean` | no | Send body as HTML when true. |

## Database Query (`db-query`)
Runs SQL operations against a configured data source.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dbType` | `select` | yes | Database engine type. |
| `connectionString` | `password` | yes | Database connection string (prefer secrets). |
| `operation` | `select` | yes | Query mode: `query`, `insert`, `update`, `delete`. |
| `query` | `textarea` | yes | SQL statement with placeholders (`$1`, `$2`, ...). |
| `params` | `json` | no | Parameter array for placeholders. |
| `timeout` | `number` | no | Query timeout in milliseconds. |

## GitHub (`github`)
Reads repository metadata/issues/PRs and can create issues.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `personalAccessToken` | `password` | no | PAT for private repos or write actions. |
| `owner` | `text` | yes | Repo owner or organization name. |
| `repo` | `text` | yes | Repository name. |
| `operation` | `select` | yes | `get_repository`, `list_issues`, `list_pull_requests`, `create_issue`. |
| `perPage` | `number` | no | Page size for list operations. |
| `issueTitle` | `text` | no | New issue title (`create_issue` only). |
| `issueBody` | `textarea` | no | New issue body (`create_issue` only). |

## Google Calendar (`google-calendar`)
Lists and manages Google Calendar events.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `authMode` | `select` | yes | Auth source: connected OAuth or manual credentials. |
| `googleConnectionId` | `google-account` | yes | Linked Google account ID (OAuth mode). |
| `credentialType` | `select` | no | Manual credential style (`oauth_access_token` or `service_account_json`). |
| `credentialsSecret` | `password` | no | Token or service account JSON (manual mode). |
| `calendarId` | `text` | yes | Target calendar ID (`primary` by default). |
| `operation` | `select` | yes | `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`. |
| `timeMin` | `datetime` | no | List lower bound datetime (`list_events`). |
| `timeMax` | `datetime` | no | List upper bound datetime (`list_events`). |
| `eventId` | `text` | no | Event ID for get/update/delete. |
| `eventSummary` | `text` | no | Event title for create/update. |
| `eventDescription` | `textarea` | no | Event description for create/update. |
| `eventStart` | `datetime` | no | Event start for create. |
| `eventEnd` | `datetime` | no | Event end for create. |
| `timeZone` | `text` | no | Event timezone (defaults to `UTC`). |
| `location` | `text` | no | Event location for create/update. |
| `attendeesJson` | `json` | no | Attendees array for create/update. |

## Google Meet (`google-meet`)
Creates Meet links via Calendar conference data.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `authMode` | `select` | yes | Auth source: connected OAuth or manual credentials. |
| `googleConnectionId` | `google-account` | yes | Linked Google account ID (OAuth mode). |
| `credentialType` | `select` | no | Manual credential style. |
| `credentialsSecret` | `password` | no | Token or service account JSON (manual mode). |
| `calendarId` | `text` | yes | Calendar to write event into. |
| `operation` | `select` | yes | `create_scheduled_meeting` or `attach_meet_to_event`. |
| `meetingTitle` | `text` | no | Meeting title (create mode). |
| `startTime` | `datetime` | no | Meeting start time (create mode). |
| `endTime` | `datetime` | no | Meeting end time (create mode). |
| `existingEventId` | `text` | no | Existing event ID (attach mode). |
| `attendeesJson` | `json` | no | Attendee list (create mode). |

## Google Docs (`google-docs`)
Reads and edits Google Docs content.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `authMode` | `select` | yes | Auth source: connected OAuth or manual credentials. |
| `googleConnectionId` | `google-account` | yes | Linked Google account ID (OAuth mode). |
| `credentialType` | `select` | no | Manual credential style. |
| `credentialsSecret` | `password` | no | Token or service account JSON (manual mode). |
| `documentId` | `text` | no | Target document ID for read/update ops. |
| `operation` | `select` | yes | `get_document`, `append_paragraph`, `replace_all_text`, `create_document`. |
| `newDocumentTitle` | `text` | no | New doc title (`create_document`). |
| `appendText` | `textarea` | no | Text to append (`append_paragraph`). |
| `findText` | `text` | no | Text to find (`replace_all_text`). |
| `replaceText` | `text` | no | Replacement text (`replace_all_text`). |

## Google Sheets (`google-sheets`)
Reads and writes spreadsheet ranges.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `authMode` | `select` | yes | Auth source: connected OAuth or manual credentials. |
| `googleConnectionId` | `google-account` | yes | Linked Google account ID (OAuth mode). |
| `credentialType` | `select` | no | Manual credential style. |
| `credentialsSecret` | `password` | no | Token or service account JSON (manual mode). |
| `spreadsheetId` | `text` | yes | Spreadsheet ID from URL. |
| `operation` | `select` | yes | `read_range`, `append_rows`, `update_values`, `clear_range`. |
| `rangeA1` | `text` | yes | Range in A1 notation (for example `Sheet1!A1:D10`). |
| `valuesJson` | `json` | no | 2D array values for append/update. |
| `valueInputOption` | `select` | no | `USER_ENTERED` or `RAW` for write ops. |

## If / Else (`if-condition`)
Branches execution on a single boolean condition.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `leftPath` | `text` | yes | Dot path to input value to evaluate. |
| `operator` | `select` | yes | Comparison operator (equals, contains, regex, numeric checks, empty checks). |
| `rightValue` | `text` | no | Comparison value (not used by exists/empty operators). |
| `caseSensitive` | `boolean` | no | Case-sensitive string matching when true. |

## Switch / Router (`switch-case`)
Routes execution to one of many branches by value matching.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `valuePath` | `text` | yes | Dot path to route value. |
| `cases` | `json` | yes | Array of case objects (`{ value, label }`). |
| `defaultBranch` | `text` | no | Branch label when no case matches. |

## Loop / Iterator (`loop`)
Iterates over an array and runs child path per item.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `arrayPath` | `text` | yes | Dot path to source array. |
| `maxIterations` | `number` | no | Upper safety cap for processed items. |
| `concurrency` | `number` | no | Number of items processed in parallel. |
| `continueOnError` | `boolean` | no | Continue remaining items if one fails. |

## AI Agent (`ai-agent`)
Runs prompt-based LLM tasks for generation/analysis/reasoning.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `provider` | `select` | yes | LLM provider (`openai`, `anthropic`, `google`, `openrouter`, `custom`, `local`). |
| `model` | `select` | yes | Model identifier to use. |
| `customModelName` | `text` | no | Custom model name when model is `custom`. |
| `customUrl` | `url` | no | Custom endpoint URL for custom/local/openrouter. |
| `apiKey` | `password` | no | Provider API key (usually via secrets). |
| `systemPrompt` | `textarea` | yes | Role/instructions for the model. |
| `userPromptTemplate` | `textarea` | yes | Input prompt template with variables. |
| `temperature` | `number` | no | Sampling randomness. |
| `maxTokens` | `number` | no | Maximum completion tokens. |
| `responseFormat` | `select` | no | Output style: text or JSON. |
| `memoryEnabled` | `boolean` | no | Enable long-term memory features. |
| `memoryType` | `select` | no | Memory strategy when memory enabled. |
| `memoryConnectionId` | `text` | no | Memory storage connection identifier. |
| `embeddingApiKey` | `password` | no | API key for embedding generation. |
| `embeddingModel` | `select` | no | Embedding model for vector memory. |
| `maxMemoryEntries` | `number` | no | Maximum stored memory entries. |
| `knowledgeBaseEnabled` | `boolean` | no | Enable KB retrieval. |
| `knowledgeDocuments` | `multi-select` | no | Knowledge collections to include. |

## Text Transform (`text-transform`)
Applies deterministic string/template transformations.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `operation` | `select` | yes | Transform op: template, regex, upper/lower, trim, split, join. |
| `inputPath` | `text` | yes | Dot path to source text. |
| `template` | `textarea` | no | Template text or regex pattern (operation dependent). |
| `replacement` | `text` | no | Regex replacement text (`regex` operation). |
| `separator` | `text` | no | Delimiter for split/join operations. |

## Delay / Wait (`delay`)
Pauses run for a duration or until a target datetime.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `delayType` | `select` | no | `fixed` duration or `until` datetime. |
| `durationMs` | `number` | yes | Delay duration in milliseconds (`fixed`). |
| `untilTime` | `datetime` | no | ISO datetime target (`until`). |

## Error Handler (`error-handler`)
Defines error recovery behavior for upstream failures.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `strategy` | `select` | yes | Recovery mode: retry, fallback, skip, abort. |
| `maxRetries` | `number` | no | Retry attempts (`retry` strategy). |
| `retryDelayMs` | `number` | no | Delay between retries (`retry`). |
| `backoffMultiplier` | `number` | no | Exponential backoff factor (`retry`). |
| `fallbackValue` | `json` | no | Substitute value (`fallback` strategy). |
| `notifyOnError` | `boolean` | no | Emit notification when handling error. |

## Manual Approval (`approval`)
Waits for a person to approve/reject before continuing.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `approvers` | `text` | yes | Comma-separated approver emails. |
| `message` | `textarea` | yes | Approval request context/instructions. |
| `timeoutHours` | `number` | no | Auto-timeout threshold in hours. |
| `timeoutAction` | `select` | no | Action on timeout: reject, approve, abort. |
| `requireComment` | `boolean` | no | Require approver comment if enabled. |

## Artifact Writer (`artifact-writer`)
Persists selected output data as downloadable run artifact.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | `text` | yes | Artifact filename. |
| `format` | `select` | yes | Output format: JSON, text, markdown, CSV. |
| `contentPath` | `text` | no | Dot path to payload subset (empty = full payload). |
| `public` | `boolean` | no | Generate public download URL if true. |

## Webhook Response (`webhook-response`)
Returns final HTTP response to original webhook caller.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `statusCode` | `number` | yes | HTTP status code to return. |
| `headers` | `json` | no | Response header object. |
| `bodyTemplate` | `textarea` | no | Response body template with variables. |

## How to use these nodes

1. Add an `Entry Point` first.
2. Connect integration/logic/AI nodes in sequence.
3. Configure each node in the right panel; required fields are marked with `*`.
4. Use `{{secrets.KEY}}` instead of hardcoding credentials.
5. End webhook-triggered flows with `Webhook Response` for explicit API responses.
