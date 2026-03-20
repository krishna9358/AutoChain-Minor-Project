import { BaseNodeExecutor } from '../../execution/base-executor';
import {
  MemoryNode,
  NodeExecutionContext,
} from '../../types/nodes';
import { getConnectionManager } from '../../connections/manager';
import { OpenAI } from 'openai';
import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import weaviate, { WeaviateClient, ObjectsBatcher } from 'weaviate-ts-client';
import { ChromaClient, Collection } from 'chromadb';
import { createClient } from '@libsql/client'; // For SQLite-based memory
import { createClient as createRedisClient } from 'redis';

/**
 * Memory Node Executor
 * Handles vector database operations and knowledge management
 */
export class MemoryNodeExecutor extends BaseNodeExecutor {
  private pineconeClients: Map<string, Pinecone> = new Map();
  private weaviateClients: Map<string, WeaviateClient> = new Map();
  private chromaClients: Map<string, ChromaClient> = new Map();
  private sqliteClients: Map<string, any> = new Map();
  private redisClients: Map<string, any> = new Map();

  protected async executeNode(
    node: MemoryNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ["memory_type", "operation", "provider"]);

    // Resolve template variables in data
    const resolvedData = node.data ? this.resolveTemplate(node.data, context) : null;
    const resolvedSearchConfig = node.search_config
      ? this.resolveTemplate(node.search_config, context)
      : null;

    // Execute memory operation based on type and operation
    const result = await this.executeMemoryOperation(
      node.memory_type,
      node.operation,
      node.provider,
      node,
      resolvedData,
      resolvedSearchConfig,
      context
    );

    return {
      memory_type: node.memory_type,
      operation: node.operation,
      provider: node.provider,
      index: node.index,
      result: result,
      data_summary: resolvedData ? this.summarizeData(resolvedData) : null,
      search_config: resolvedSearchConfig,
      metadata: {
        execution_time_ms: result.execution_time_ms || 0,
        memory_provider: node.provider,
        embedding_model: node.embedding_model,
        operation_timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Execute memory operation based on type and provider
   */
  private async executeMemoryOperation(
    memoryType: string,
    operation: string,
    provider: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Route to appropriate provider handler
      switch (provider) {
        case 'pinecone':
          return await this.executePineconeOperation(
            memoryType,
            operation,
            node,
            data,
            searchConfig,
            context
          );

        case 'weaviate':
          return await this.executeWeaviateOperation(
            memoryType,
            operation,
            node,
            data,
            searchConfig,
            context
          );

        case 'chromadb':
          return await this.executeChromaOperation(
            memoryType,
            operation,
            node,
            data,
            searchConfig,
            context
          );

        case 'milvus':
          return await this.executeMilvusOperation(
            memoryType,
            operation,
            node,
            data,
            searchConfig,
            context
          );

        case 'redis':
          return await this.executeRedisOperation(
            memoryType,
            operation,
            node,
            data,
            searchConfig,
            context
          );

        case 'custom':
          return await this.executeCustomMemoryOperation(
            memoryType,
            operation,
            node,
            data,
            searchConfig,
            context
          );

        default:
          throw new Error(`Unsupported memory provider: ${provider}`);
      }
    } catch (error: any) {
      throw new Error(`Memory operation failed: ${error.message}`);
    } finally {
      return { execution_time_ms: Date.now() - startTime };
    }
  }

  /**
   * Execute Pinecone operations
   */
  private async executePineconeOperation(
    memoryType: string,
    operation: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const apiKey = node.api_key?.startsWith("env.")
      ? process.env[node.api_key.substring(4)]
      : node.api_key;

    if (!apiKey) {
      throw new Error("Pinecone API key not configured");
    }

    let pinecone = this.pineconeClients.get(apiKey);
    if (!pinecone) {
      pinecone = new Pinecone({ apiKey });
      this.pineconeClients.set(apiKey, pinecone);
    }

    const index = await this.getPineconeIndex(pinecone, node.index, node.environment);

    switch (operation) {
      case 'store':
        return await this.storeInPinecone(index, data, node.embedding_model || '', context);

      case 'retrieve':
        return await this.retrieveFromPinecone(index, data, context);

      case 'search':
        return await this.searchInPinecone(index, searchConfig, data, context);

      case 'delete':
        return await this.deleteFromPinecone(index, data, context);

      case 'update':
        return await this.updateInPinecone(index, data, node.embedding_model || '', context);

      default:
        throw new Error(`Unknown Pinecone operation: ${operation}`);
    }
  }

  /**
   * Get or create Pinecone index
   */
  private async getPineconeIndex(
    pinecone: Pinecone,
    indexName: string,
    environment?: string
  ): Promise<Index> {
    try {
      // List existing indexes
      const indexes = await pinecone.listIndexes();
      const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);

      if (existingIndex) {
        return pinecone.index(indexName);
      }

      // Create new index with default configuration
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // Default for OpenAI embeddings
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: environment || 'us-east-1',
          },
        },
      });

      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      return pinecone.index(indexName);
    } catch (error: any) {
      throw new Error(`Failed to get Pinecone index: ${error.message}`);
    }
  }

  /**
   * Store data in Pinecone
   */
  private async storeInPinecone(
    index: Index,
    data: any,
    embeddingModel: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const { text, vector, metadata, id } = data;

    if (!text && !vector) {
      throw new Error('Either text or vector must be provided');
    }

    // Generate embedding if not provided
    const embedding = vector || await this.generateEmbedding(text, embeddingModel);

    const record = {
      id: id || this.generateId(),
      values: embedding,
      metadata: {
        text,
        ...metadata,
        timestamp: new Date().toISOString(),
        workflow_id: context.workflow_id,
        execution_id: context.execution_id,
      },
    };

    await index.upsert({ records: [record] } as any);

    return {
      success: true,
      operation: "store",
      record_id: record.id,
      vector_dimension: embedding.length,
    };
  }

  /**
   * Retrieve data from Pinecone
   */
  private async retrieveFromPinecone(
    index: Index,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id } = data;

    if (!id) {
      throw new Error("Object ID is required for retrieval");
    }

    const response = await index.fetch({ ids: [id] } as any);

    if (!response.records || Object.keys(response.records).length === 0) {
      return {
        success: false,
        operation: "retrieve",
        records: [],
      };
    }

    const records = Object.values(response.records).map((record: any) => ({
      id: record.id,
      vector: record.values,
      metadata: record.metadata,
      score: record.score,
    }));

    return {
      success: true,
      operation: "retrieve",
      records,
      count: records.length,
    };
  }

  /**
   * Search in Pinecone
   */
  private async searchInPinecone(
    index: Index,
    searchConfig: any,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { query, top_k = 5, filter, score_threshold = 0.7 } = searchConfig;

    if (!query && !data?.query) {
      throw new Error('Query is required for search');
    }

    const searchQuery = query || data?.query;

    // Generate embedding for query
    const embeddingModel = data?.embedding_model || 'text-embedding-3-large';
    const queryEmbedding = await this.generateEmbedding(searchQuery, embeddingModel);

    const response = await index.query({
      vector: queryEmbedding,
      topK: top_k,
      includeMetadata: true,
      filter: filter,
    });

    // Filter by score threshold
    const matches = (response.matches || []).filter(
      match => match.score && match.score >= score_threshold
    );

    return {
      success: true,
      operation: 'search',
      query: searchQuery,
      matches: matches.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
        vector: match.values,
      })),
      count: matches.length,
      top_k: top_k,
      score_threshold,
    };
  }

  /**
   * Delete data from Pinecone
   */
  private async deleteFromPinecone(
    index: Index,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id } = data;

    if (!id) {
      throw new Error("Object ID is required for delete");
    }

    await index.deleteOne(id);

    return {
      success: true,
      operation: "delete",
      deleted_id: id,
    };
  }

  /**
   * Update data in Pinecone
   */
  private async updateInPinecone(
    index: Index,
    data: any,
    embeddingModel: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id, text, vector, metadata } = data;

    if (!id) {
      throw new Error("Record ID is required for update");
    }

    // Generate embedding if text provided
    const embedding = vector || (text ? await this.generateEmbedding(text, embeddingModel) : null);

    const record: any = {
      id,
    };

    if (embedding) {
      record.values = embedding;
    }

    if (metadata || text) {
      record.metadata = {
        ...metadata,
        text,
        updated_at: new Date().toISOString(),
      };
    }

    await index.upsert({ records: [record] } as any);

    return {
      success: true,
      operation: 'update',
      updated_id: id,
      vector_dimension: embedding?.length,
    };
  }

  /**
   * Execute Weaviate operations
   */
  private async executeWeaviateOperation(
    memoryType: string,
    operation: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const apiKey = node.api_key?.startsWith('env.')
      ? process.env[node.api_key.substring(4)]
      : node.api_key;

    const host = node.environment || 'http://localhost:8080';

    let client = this.weaviateClients.get(apiKey + host);
    if (!client) {
      client = weaviate.client({
        scheme: host.startsWith('https') ? 'https' : 'http',
        host: host.replace(/^https?:\/\//, ''),
        apiKey: apiKey as any,
      });
      this.weaviateClients.set(apiKey + host, client);
    }

    const weaviateClient = client as WeaviateClient;

    switch (operation) {
      case "store":
        return await this.storeInWeaviate(weaviateClient, node.index, data, node.embedding_model || '', context);
      case "retrieve":
        return await this.retrieveFromWeaviate(weaviateClient, node.index, data, context);
      case "search":
        return await this.searchInWeaviate(weaviateClient, node.index, searchConfig, data, context);
      case "delete":
        return await this.deleteFromWeaviate(weaviateClient, node.index, data, context);
      case "update":
        return await this.updateInWeaviate(weaviateClient, node.index, data, node.embedding_model || '', context);
      default:
        throw new Error(`Unknown Weaviate operation: ${operation}`);
    }
  }

  /**
   * Store data in Weaviate
   */
  private async storeInWeaviate(
    client: WeaviateClient,
    className: string,
    data: any,
    embeddingModel: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const { text, vector, metadata, id } = data;

    if (!text && !vector) {
      throw new Error('Either text or vector must be provided');
    }

    const embedding = vector || await this.generateEmbedding(text, embeddingModel);

    const dataObj = {
      id: id || this.generateId(),
      vector: embedding,
      properties: {
        text,
        ...metadata,
        timestamp: new Date().toISOString(),
        workflow_id: context.workflow_id,
        execution_id: context.execution_id,
      },
    };

    await client.data.creator()
      .withClassName(className)
      .withId(dataObj.id)
      .withVector(dataObj.vector)
      .withProperties(dataObj.properties)
      .do();

    return {
      success: true,
      operation: "store",
      record_id: dataObj.id,
      vector_dimension: embedding.length,
    };
  }

  /**
   * Retrieve data from Weaviate
   */
  private async retrieveFromWeaviate(
    client: WeaviateClient,
    className: string,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id } = data;

    const result = await client.data.getterById()
      .withId(id)
      .withClassName(className)
      .do();

    return {
      success: true,
      operation: 'retrieve',
      record: result,
    };
  }

  /**
   * Search in Weaviate
   */
  private async searchInWeaviate(
    client: WeaviateClient,
    className: string,
    searchConfig: any,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { query, top_k = 5, score_threshold = 0.7 } = searchConfig;

    const searchQuery = query || data?.query;
    const embeddingModel = data?.embedding_model || 'text-embedding-3-large';
    const queryEmbedding = await this.generateEmbedding(searchQuery, embeddingModel);

    const result = await client.graphql.get()
      .withClassName(className)
      .withNearVector({
        vector: queryEmbedding,
        certainty: score_threshold,
      })
      .withLimit(top_k)
      .do();

    return {
      success: true,
      operation: 'search',
      query: searchQuery,
      matches: result.data.Get[className],
      count: result.data.Get[className]?.length || 0,
    };
  }

  /**
   * Delete data from Weaviate
   */
  private async deleteFromWeaviate(
    client: WeaviateClient,
    className: string,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id } = data;

    await client.data.deleter()
      .withId(id)
      .withClassName(className)
      .do();

    return {
      success: true,
      operation: "delete",
      deleted_id: id,
    };
  }

  /**
   * Update data in Weaviate
   */
  private async updateInWeaviate(
    client: WeaviateClient,
    className: string,
    data: any,
    embeddingModel: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id, text, vector, metadata } = data;

    const embedding = vector || (text ? await this.generateEmbedding(text, embeddingModel) : null);

    await (client as any).dataUpdater()
      .withId(id)
      .withClassName(className)
      .withProperties({
        text,
        ...metadata,
        updated_at: new Date().toISOString(),
      })
      .withVector(embedding)
      .do();

    return {
      success: true,
      operation: 'update',
      updated_id: id,
    };
  }

  /**
   * Execute ChromaDB operations
   */
  private async executeChromaOperation(
    memoryType: string,
    operation: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    let client = this.chromaClients.get('default');
    if (!client) {
      client = new ChromaClient({
        path: node.environment || 'http://localhost:8000',
      });
      this.chromaClients.set('default', client);
    }

    const collection = await client.getOrCreateCollection({
      name: node.index,
    });

    switch (operation) {
      case "store":
        return await this.storeInChroma(collection, data, node.embedding_model || '', context);
      case "retrieve":
        return await this.retrieveFromChroma(collection, data, context);
      case "search":
        return await this.searchInChroma(collection, searchConfig, data, context);
      case "delete":
        return await this.deleteFromChroma(collection, data, context);
      case "update":
        return await this.updateInChroma(collection, data, node.embedding_model || '', context);
      default:
        throw new Error(`Unknown ChromaDB operation: ${operation}`);
    }
  }

  /**
   * Store data in ChromaDB
   */
  private async storeInChroma(
    collection: Collection,
    data: any,
    embeddingModel: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const { text, vector, metadata, id } = data;

    const embedding = vector || (text ? await this.generateEmbedding(text, embeddingModel) : null);

    await collection.add({
      ids: [id || this.generateId()],
      embeddings: embedding ? [embedding] : undefined,
      documents: text ? [text] : undefined,
      metadatas: [
        {
          ...metadata,
          timestamp: new Date().toISOString(),
          workflow_id: context.workflow_id,
        },
      ],
    });

    return {
      success: true,
      operation: 'store',
      record_id: id,
    };
  }

  /**
   * Retrieve data from ChromaDB
   */
  private async retrieveFromChroma(
    collection: Collection,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id } = data;

    const results = await collection.get({
      ids: [id],
    });

    return {
      success: true,
      operation: 'retrieve',
      records: results.ids.map((rid, i) => ({
        id: rid,
        document: results.documents[i],
        metadata: results.metadatas[i],
      })),
    };
  }

  /**
   * Search in ChromaDB
   */
  private async searchInChroma(
    collection: Collection,
    searchConfig: any,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { query, top_k = 5, score_threshold = 0.7 } = searchConfig;

    const searchQuery = query || data?.query;
    const embeddingModel = data?.embedding_model || 'text-embedding-3-large';
    const queryEmbedding = await this.generateEmbedding(searchQuery, embeddingModel);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: top_k,
    });

    // Filter by score threshold if available
    const matches = results.documents[0]
      ? results.documents[0].map((doc, i) => ({
          id: results.ids[0][i],
          document: doc,
          metadata: results.metadatas[0][i],
          distance: results.distances[0][i],
        }))
          .filter(match => (1 - (match.distance ?? 0)) >= score_threshold)
      : [];

    return {
      success: true,
      operation: 'search',
      query: searchQuery,
      matches,
      count: matches.length,
      top_k,
    };
  }

  /**
   * Delete data from ChromaDB
   */
  private async deleteFromChroma(
    collection: Collection,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id } = data;

    await collection.delete({
      ids: [id],
    });

    return {
      success: true,
      operation: "delete",
      deleted_id: id,
    };
  }

  /**
   * Update data in ChromaDB
   */
  private async updateInChroma(
    collection: Collection,
    data: any,
    embeddingModel: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id, text, vector, metadata } = data;

    const embedding = vector || (text ? await this.generateEmbedding(text, embeddingModel) : null);

    await collection.update({
      ids: [id],
      embeddings: embedding ? [embedding] : undefined,
      documents: text ? [text] : undefined,
      metadatas: [
        {
          ...metadata,
          updated_at: new Date().toISOString(),
        },
      ],
    });

    return {
      success: true,
      operation: 'update',
      updated_id: id,
    };
  }

  /**
   * Execute Redis operations
   */
  private async executeRedisOperation(
    memoryType: string,
    operation: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const connectionManager = getConnectionManager();
    const connection = await connectionManager.getConnection(node.connection_id || '');

    if (!connection) {
      throw new Error(`Redis connection not found: ${node.connection_id}`);
    }

    let client = this.redisClients.get(node.connection_id || '');
    if (!client) {
      client = createRedisClient({
        socket: {
          host: (connection as any).host,
          port: (connection as any).port || 6379,
        },
        password: connection.credentials.password,
      });
      this.redisClients.set(node.connection_id || '', client);
    }

    const key = `${context.workflow_id}:${node.index}`;

    switch (operation) {
      case "store":
        return await this.storeInRedis(client, key, data, context);
      case "retrieve":
        return await this.retrieveFromRedis(client, key, context);
      case "search":
        return await this.searchInRedis(client, key, searchConfig, data, context);
      case "delete":
        return await this.deleteFromRedis(client, key, context);
      case "update":
        return await this.updateInRedis(client, key, data, context);
      default:
        throw new Error(`Unknown Redis operation: ${operation}`);
    }
  }

  /**
   * Store data in Redis
   */
  private async storeInRedis(
    client: any,
    key: string,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { id, text, metadata } = data;

    const value = JSON.stringify({
      id: id || this.generateId(),
      text,
      metadata,
      timestamp: new Date().toISOString(),
      workflow_id: context.workflow_id,
    });

    await client.set(key, value);
    await client.expire(key, 86400); // 24 hours TTL

    return {
      success: true,
      operation: 'store',
      key,
    };
  }

  /**
   * Retrieve data from Redis
   */
  private async retrieveFromRedis(
    client: any,
    key: string,
    context: NodeExecutionContext
  ): Promise<any> {
    const value = await client.get(key);

    if (!value) {
      return {
        success: false,
        operation: "retrieve",
        record: null,
      };
    }

    return {
      success: true,
      operation: 'retrieve',
      record: JSON.parse(value),
    };
  }

  /**
   * Search in Redis (simple pattern matching)
   */
  private async searchInRedis(
    client: any,
    key: string,
    searchConfig: any,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { query, top_k = 5 } = searchConfig;
    const pattern = `${key}:*`;
    const keys = await client.keys(pattern);

    const records = [];
    for (const k of keys) {
      const value = await client.get(k);
      if (value) {
        records.push(JSON.parse(value));
      }
    }

    return {
      success: true,
      operation: 'search',
      records,
      count: records.length,
    };
  }

  /**
   * Delete data from Redis
   */
  private async deleteFromRedis(
    client: any,
    key: string,
    context: NodeExecutionContext
  ): Promise<any> {
    await client.del(key);

    return {
      success: true,
      operation: 'delete',
      key,
    };
  }

  /**
   * Update data in Redis
   */
  private async updateInRedis(
    client: any,
    key: string,
    data: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const { text, metadata } = data;

    const existingValue = await client.get(key);
    if (!existingValue) {
      throw new Error('Key not found for update');
    }

    const existing = JSON.parse(existingValue);
    const updated = {
      ...existing,
      text: text || existing.text,
      metadata: metadata || existing.metadata,
      updated_at: new Date().toISOString(),
    };

    await client.set(key, JSON.stringify(updated));

    return {
      success: true,
      operation: 'update',
      key,
    };
  }

  /**
   * Execute Milvus operations
   */
  private async executeMilvusOperation(
    memoryType: string,
    operation: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    // Placeholder for Milvus implementation
    // In a real implementation, this would use @zilliz/milvus2-sdk-node
    return {
      success: true,
      operation,
      provider: 'milvus',
      message: 'Milvus operations not yet implemented',
    };
  }

  /**
   * Execute custom memory operation
   */
  private async executeCustomMemoryOperation(
    memoryType: string,
    operation: string,
    node: MemoryNode,
    data: any,
    searchConfig: any,
    context: NodeExecutionContext
  ): Promise<any> {
    // Placeholder for custom memory implementation
    // In a real implementation, this would use a custom API or SDK
    return {
      success: true,
      operation,
      provider: 'custom',
      message: 'Custom memory operations not yet implemented',
    };
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(
    text: string,
    model: string
  ): Promise<number[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key not configured for embeddings");
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    const embeddingModel =
      process.env.OPENROUTER_EMBEDDING_MODEL || model || "openai/text-embedding-3-large";

    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Summarize data for logging
   */
  private summarizeData(data: any): any {
    if (!data) return null;

    if (typeof data.text === 'string') {
      return {
        text_length: data.text.length,
        has_metadata: !!data.metadata,
        has_vector: !!data.vector,
      };
    }

    if (typeof data === 'object') {
      return {
        keys: Object.keys(data),
        size: Object.keys(data).length,
      };
    }

    return data;
  }

  /**
   * Clean up all clients
   */
  public async cleanup(): Promise<void> {
    for (const client of this.redisClients.values()) {
      await client.quit();
    }
    this.redisClients.clear();

    // Clear other client caches
    this.pineconeClients.clear();
    this.weaviateClients.clear();
    this.chromaClients.clear();
    this.sqliteClients.clear();
  }
}

/**
 * Export types for use in other modules
 */
export type { MemoryNode };
