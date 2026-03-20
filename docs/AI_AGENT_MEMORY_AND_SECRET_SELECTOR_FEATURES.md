# AI Agent Memory Tool & Secret Selector Features

This document describes the new features added to the AutoChain AI platform for enhanced AI agent configuration and better secret management UX.

## 📋 Table of Contents

- [Overview](#overview)
- [Feature 1: AI Agent Memory Tool](#feature-1-ai-agent-memory-tool)
- [Feature 2: Custom URL and API Key Support](#feature-2-custom-url-and-api-key-support)
- [Feature 3: Secret Selector Dropdown](#feature-3-secret-selector-dropdown)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

Three major enhancements have been added to improve the AI agent workflow builder:

1. **Memory Tool for AI Agents**: Enable agents to store and retrieve context across conversations
2. **Custom URL Support**: Configure self-hosted or custom AI providers with custom endpoints
3. **Secret Selector Dropdown**: Improved UX for selecting secrets from the secret library

---

## Feature 1: AI Agent Memory Tool

### What is Memory?

Memory allows AI agents to maintain context across multiple interactions. This enables agents to:
- Remember previous conversations
- Retrieve relevant information from a knowledge base
- Maintain state across workflow runs
- Provide more coherent and personalized responses

### Supported Memory Types

| Memory Type | Description | Use Case |
|------------|-------------|----------|
| **Vector** | Semantic search using embeddings | Finding similar past conversations, document retrieval |
| **Key-Value** | Simple key-value storage | Storing user preferences, session data |
| **Conversation** | Full conversation history | Chat applications, customer support |
| **Episodic** | Event-based memory | Logging actions and decisions |

### How to Enable Memory

1. **Add or Edit an AI Agent Node** in your workflow

2. **Enable Memory Toggle**:
   ```
   Enable Memory: ✓ (checked)
   ```

3. **Configure Memory Settings**:

   - **Memory Type**: Select from Vector, Key-Value, Conversation, or Episodic
   - **Memory Connection ID**: Enter your vector database connection ID (e.g., `pinecone_prod`)
   - **Embedding API Key**: Provide the API key for embeddings (use Secret Selector for security!)
   - **Embedding Model**: Choose the embedding model (default: `text-embedding-3-large`)
   - **Max Memory Entries**: Set the maximum number of entries to store (default: 1000)

### Example Configuration

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "apiKey": "{{secrets.OPENAI_KEY}}",
  "systemPrompt": "You are a helpful assistant with access to memory.",
  "memoryEnabled": "true",
  "memoryType": "vector",
  "memoryConnectionId": "pinecone_prod",
  "embeddingApiKey": "{{secrets.EMBEDDINGS_KEY}}",
  "embeddingModel": "text-embedding-3-large",
  "maxMemoryEntries": 1000
}
```

### Knowledge Base Integration

The AI agent can also access a knowledge base for document retrieval:

1. **Enable Knowledge Base Toggle**:
   ```
   Enable Knowledge Base: ✓ (checked)
   ```

2. **Select Document Collections**:
   - Company Policies
   - Product Documentation
   - FAQ
   - Technical Guides

### Backend Support

The backend already supports these memory configurations through:
- `MemoryNodeExecutor` for vector operations
- Support for Pinecone, Weaviate, and other vector databases
- Automatic secret resolution before execution

---

## Feature 2: Custom URL and API Key Support

### What's New

You can now configure AI agents to work with:
- **Custom/self-hosted LLM providers** (e.g., Ollama, vLLM, local models)
- **OpenRouter** and other OpenAI-compatible APIs
- **Custom API endpoints** with base URL configuration

### Provider Options

The AI Provider dropdown now includes:

| Provider | Description | Requires API Key | Requires Custom URL |
|----------|-------------|------------------|-------------------|
| OpenAI (GPT) | Official OpenAI API | Yes | No |
| Anthropic (Claude) | Claude API | Yes | No |
| Google (Gemini) | Google AI Studio | Yes | No |
| OpenRouter | Multi-provider router | Yes | Optional |
| **Custom / Self-hosted** | Your own API endpoint | Optional | **Yes** |
| **Local (Ollama)** | Local Ollama server | No | **Yes** |

### Configuration Examples

#### Example 1: Custom API Endpoint

```
Provider: Custom / Self-hosted
Model: Llama 3 (70B)
Custom Model Name: meta-llama/Meta-Llama-3-70B
Custom API URL: https://api.example.com/v1
API Key: {{secrets.CUSTOM_API_KEY}} (optional)
```

#### Example 2: Local Ollama

```
Provider: Local (Ollama)
Model: Llama 3 (8B)
Custom API URL: http://localhost:11434
API Key: (not required)
```

#### Example 3: OpenRouter

```
Provider: OpenRouter
Model: Llama 3 (70B)
Custom API URL: https://openrouter.ai/api/v1 (auto-filled)
API Key: {{secrets.OPENROUTER_KEY}}
```

### Adding Custom Models

1. Select **"Custom Model Name"** from the Model dropdown
2. Enter your custom model name in the **Custom Model Name** field
3. Example: `meta-llama/Meta-Llama-3-70B`, `mistralai/Mistral-Large`

### Field Visibility

- **Custom API URL**: Shows when provider is "custom", "local", or "openrouter"
- **Custom Model Name**: Shows when model is "custom"
- **API Key**: Made optional for local providers

---

## Feature 3: Secret Selector Dropdown

### What's Changed

Previously, users had to manually type secret references like `{{secrets.MY_KEY}}` into password fields. This was error-prone and required remembering exact secret names.

**New Experience**: Click the "Select Secret" button to see a dropdown of all available secrets in your workspace.

### How It Works

1. **Password and API Key Fields** now include a "Select Secret" button

2. **Click the Button** to open the secret selector dropdown

3. **Browse and Search**:
   - Search by secret name or reference key
   - See secret type (API_KEY, PASSWORD, TOKEN, etc.)
   - View description if available
   - Refresh the list with the refresh button

4. **Select a Secret**:
   - Click on any secret to insert `{{secrets.SECRET_KEY}}` into the field
   - The dropdown closes automatically
   - The secret reference is now in your field

5. **Manage Secrets**:
   - Click "Manage secrets →" to open the Secrets dashboard
   - Add new secrets, edit existing ones, or revoke access

### Secret Selector Features

- ✅ **Workspace-scoped**: Only shows secrets from your current workspace
- ✅ **Search**: Quickly find secrets by name or key
- ✅ **Type indicators**: Color-coded icons for different secret types
- ✅ **Refresh**: Reload secrets without reopening the node
- ✅ **Smart insertion**: If field is empty, replaces content; if not, appends with space
- ✅ **Error handling**: Shows error message if secrets can't be loaded
- ✅ **Empty state**: Helpful message when no secrets exist

### Secret Types Supported

| Type | Icon Color | Description |
|------|-----------|-------------|
| API_KEY | Purple | API keys for services |
| PASSWORD | Amber | Passwords and credentials |
| TOKEN | Blue | Access tokens |
| CERTIFICATE | Green | SSL/TLS certificates |
| DATABASE_URL | Pink | Database connection strings |
| OTHER | Gray | Other sensitive data |

### Example Usage

**Before** (Manual):
```
API Key: {{secrets.OPENAI_KEY}}
```

**After** (With Secret Selector):
1. Click "Select Secret" button
2. Search for "OPENAI"
3. Click on the secret with key "OPENAI_KEY"
4. The field automatically fills with: `{{secrets.OPENAI_KEY}}`

### Fields That Support Secret Selector

- AI Agent: API Key, Embedding API Key
- HTTP Request: Auth Token / Key
- Email Send: API Key / Password
- Database Query: Connection String
- GitHub: Personal Access Token
- Google Calendar/Meet/Docs/Sheets: Credentials / token
- Any field with type: `password` or `api-key`

### Backend Compatibility

The secret selector is purely a frontend UX improvement. The backend already supports:
- Secret reference resolution via `{{secrets.KEY}}` syntax
- Workspace-scoped secret retrieval
- Encrypted secret storage and decryption

---

## Migration Guide

### For Existing Workflows

No changes required for existing workflows. All existing configurations will continue to work as before.

### To Use New Features

1. **Update AI Agent Nodes**: Edit any AI agent node to see the new configuration options
2. **Add Secrets**: Go to Dashboard → Secrets to add secrets that can be selected via dropdown
3. **Configure Custom Providers**: Change provider to "Custom / Self-hosted" and set the API URL

### Secret Migration

If you have manually typed secret references in your workflow nodes:
- They will continue to work
- Consider using the Secret Selector for new entries
- No migration needed - the system reads both formats identically

---

## Troubleshooting

### Common Issues

#### Secret Selector Not Showing

**Issue**: The "Select Secret" button doesn't appear

**Cause**: Workspace ID is not provided to the component

**Solution**: 
- Ensure you're editing a node in a workspace context
- Check that the workflow belongs to a workspace
- Reload the page and try again

#### Secrets Not Loading

**Issue**: Dropdown shows "Failed to load secrets"

**Cause**: Backend API error or authentication issue

**Solution**:
- Click the refresh button
- Check your authentication status
- Verify the Secrets API is running
- Check browser console for detailed errors

#### Custom URL Not Working

**Issue**: Custom API endpoint returns errors

**Cause**: URL format incorrect or provider doesn't accept custom endpoints

**Solution**:
- Ensure URL includes the protocol (http:// or https://)
- Verify the endpoint path is correct (e.g., `/v1` for OpenAI-compatible APIs)
- Check provider documentation for correct URL format
- Test the endpoint with curl or Postman first

#### Memory Not Working

**Issue**: Agent doesn't seem to remember previous conversations

**Cause**: Memory not properly configured or vector database connection issue

**Solution**:
- Verify "Enable Memory" is checked
- Check that Memory Connection ID is correct
- Ensure the embedding API key is valid
- Test vector database connection separately
- Check backend logs for memory-related errors

#### Model Not Found

**Issue**: Custom model name results in "model not found" error

**Cause**: Model name doesn't match provider's available models

**Solution**:
- Verify exact model name with provider
- Check provider's documentation for model list
- For Ollama, ensure model is pulled locally first (`ollama pull <model>`)
- Try with a standard model name first to test connection

---

## Future Enhancements

Planned improvements for future releases:

- [ ] **Memory Visualization**: UI to view and manage stored memories
- [ ] **Secret Validation**: Test secrets before saving
- [ ] **Secret Usage Tracking**: See which secrets are used where
- [ ] **Memory Analytics**: Insights into memory usage patterns
- [ ] **Import/Export Secrets**: Bulk secret management
- [ ] **Secret Expiration**: Auto-expire secrets after a period
- [ ] **Provider Templates**: Pre-configured settings for popular providers

---

## Support

If you encounter issues or have questions:

1. Check this documentation first
2. Review the [Main Documentation](/docs)
3. Check backend logs for detailed error messages
4. Open an issue on the project repository

---

## Changelog

### Version 1.0.0 (Current Release)
- ✅ Added AI Agent Memory Tool with vector, key-value, conversation, and episodic types
- ✅ Added Knowledge Base integration for document retrieval
- ✅ Added Custom URL support for AI providers
- ✅ Added Local (Ollama) provider support
- ✅ Added Secret Selector dropdown for all password/api-key fields
- ✅ Improved UX for secret management
- ✅ Added search and filtering for secret selector
- ✅ Added custom model name configuration

---

*Last updated: 2025-01-14*