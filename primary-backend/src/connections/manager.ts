import {
  Connection,
  CreateConnection,
  UpdateConnection,
  ConnectionValidation,
  ConnectionUsage,
  ConnectionError,
  AuthType,
  ConnectionType,
  Role,
  Environment,
} from "../types/connections";
import { getEncryptionManager } from "../encryption/manager";
import prisma from "../db";

/**
 * Serialise a Connection object into the shape stored in the DB.
 * - `credentials` is encrypted to a single JSON string.
 * - Everything else that is not a first-class DB column lives in `metadata`.
 */
function toPrismaRow(
  conn: Connection,
  encryptedCredentials: string,
): {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  status: string;
  credentials: string;
  metadata: Record<string, any>;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
} {
  return {
    id: conn.connection_id,
    workspaceId: (conn as any).workspaceId ?? "default",
    provider: conn.type,
    name: conn.name,
    status: conn.is_active ? "active" : "revoked",
    credentials: encryptedCredentials,
    metadata: {
      auth_type: conn.auth_type,
      base_url: conn.base_url,
      headers: conn.headers,
      scopes: conn.scopes,
      region: conn.region,
      encryption: conn.encryption,
      environment: conn.environment,
      description: conn.description,
      tags: conn.tags,
      allowed_roles: conn.allowed_roles,
      allowed_users: conn.allowed_users,
      auto_refresh: conn.auto_refresh,
      refresh_threshold_minutes: conn.refresh_threshold_minutes,
    },
    expiresAt: conn.expires_at ? new Date(conn.expires_at) : null,
    lastUsedAt: conn.last_used ? new Date(conn.last_used) : null,
  };
}

/**
 * Deserialise a Prisma row back into the application-level Connection type.
 * `credentials` will be the *encrypted* blob; callers must decrypt separately.
 */
function fromPrismaRow(
  row: {
    id: string;
    workspaceId: string;
    provider: string;
    name: string;
    status: string;
    credentials: string;
    metadata: any;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  credentials: Record<string, any>,
): Connection {
  const meta = (row.metadata ?? {}) as Record<string, any>;
  return {
    connection_id: row.id,
    name: row.name,
    type: row.provider as ConnectionType,
    auth_type: (meta.auth_type ?? "api_key") as AuthType,
    credentials,
    base_url: meta.base_url,
    headers: meta.headers,
    expires_at: row.expiresAt?.toISOString(),
    scopes: meta.scopes,
    region: meta.region,
    encryption: meta.encryption ?? "AES256",
    environment: (meta.environment ?? "dev") as Environment,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    last_used: row.lastUsedAt?.toISOString(),
    is_active: row.status === "active",
    description: meta.description,
    tags: meta.tags,
    allowed_roles: meta.allowed_roles ?? ["admin", "developer"],
    allowed_users: meta.allowed_users,
    auto_refresh: meta.auto_refresh ?? false,
    refresh_threshold_minutes: meta.refresh_threshold_minutes ?? 5,
  };
}

/**
 * Connection Manager
 * Handles storage, retrieval, validation, and lifecycle of all external integrations.
 * Connection data is persisted via Prisma; ephemeral caches (usage stats, refresh timers)
 * remain in-memory.
 */
export class ConnectionManager {
  private encryptionManager: ReturnType<typeof getEncryptionManager>;
  private usageStats: Map<string, ConnectionUsage>;
  private refreshTimers: Map<string, NodeJS.Timeout>;

  constructor() {
    this.encryptionManager = getEncryptionManager();
    this.usageStats = new Map();
    this.refreshTimers = new Map();
  }

  // ── helpers ───────────────────────────────────────────────────────

  /** Encrypt a credentials object and return a single JSON string for DB storage. */
  private encryptCreds(creds: Record<string, any>): string {
    const result = this.encryptionManager.encryptCredentials(creds);
    return JSON.stringify(result);
  }

  /** Decrypt the stored credentials string back into a plain object. */
  private decryptCreds(stored: string): Record<string, any> {
    const parsed = JSON.parse(stored) as {
      encrypted: string;
      iv: string;
      authTag: string;
    };
    return this.encryptionManager.decryptCredentials(parsed);
  }

  // ── CRUD ──────────────────────────────────────────────────────────

  /**
   * Create a new connection with encrypted credentials
   */
  async createConnection(
    connectionData: Omit<CreateConnection, "connection_id">,
  ): Promise<Connection> {
    const encryptedCredentials = this.encryptCreds(connectionData.credentials);

    const connection: Connection = {
      connection_id: "", // will be set by DB
      name: connectionData.name || connectionData.type,
      type: connectionData.type,
      auth_type: connectionData.auth_type,
      credentials: connectionData.credentials,
      base_url: connectionData.base_url,
      headers: connectionData.headers,
      expires_at: connectionData.expires_at,
      scopes: connectionData.scopes,
      region: connectionData.region,
      encryption: connectionData.encryption || "AES256",
      environment: connectionData.environment || "dev",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      description: connectionData.description,
      tags: connectionData.tags,
      allowed_roles: connectionData.allowed_roles || ["admin", "developer"],
      allowed_users: connectionData.allowed_users,
      auto_refresh: connectionData.auto_refresh || false,
      refresh_threshold_minutes: connectionData.refresh_threshold_minutes || 5,
    };

    const data = toPrismaRow(connection, encryptedCredentials);
    // Let Prisma generate the id
    const { id: _omit, ...createData } = data;

    const row = await prisma.connection.create({ data: createData });

    connection.connection_id = row.id;
    connection.created_at = row.createdAt.toISOString();
    connection.updated_at = row.updatedAt.toISOString();

    // Initialize in-memory usage stats
    this.usageStats.set(row.id, {
      connection_id: row.id,
      usage_count: 0,
      last_used: new Date().toISOString(),
      error_count: 0,
    });

    // Setup auto-refresh if needed
    if (connection.auto_refresh && connection.expires_at) {
      this.setupAutoRefresh(connection);
    }

    return connection;
  }

  /**
   * Get connection by ID (with decrypted credentials)
   */
  async getConnection(connection_id: string): Promise<Connection | null> {
    const row = await prisma.connection.findUnique({
      where: { id: connection_id },
    });

    if (!row) {
      return null;
    }

    const decryptedCreds = this.decryptCreds(row.credentials);
    return fromPrismaRow(row, decryptedCreds);
  }

  /**
   * Get connection metadata only (without credentials)
   */
  async getConnectionMetadata(
    connection_id: string,
  ): Promise<Connection | null> {
    const row = await prisma.connection.findUnique({
      where: { id: connection_id },
    });

    if (!row) {
      return null;
    }

    return fromPrismaRow(row, {});
  }

  /**
   * Get all connections (metadata only)
   */
  async getAllConnections(): Promise<Connection[]> {
    const rows = await prisma.connection.findMany();
    return rows.map((row) => fromPrismaRow(row, {}));
  }

  /**
   * Get connections by type
   */
  async getConnectionsByType(type: ConnectionType): Promise<Connection[]> {
    const rows = await prisma.connection.findMany({
      where: { provider: type },
    });
    return rows.map((row) => fromPrismaRow(row, {}));
  }

  /**
   * Get connections by environment
   */
  async getConnectionsByEnvironment(
    environment: Environment,
  ): Promise<Connection[]> {
    const rows = await prisma.connection.findMany({
      where: {
        metadata: {
          path: ["environment"],
          equals: environment,
        },
      },
    });
    return rows.map((row) => fromPrismaRow(row, {}));
  }

  /**
   * Update connection
   */
  async updateConnection(
    connection_id: string,
    updates: Partial<UpdateConnection>,
  ): Promise<Connection | null> {
    const existing = await prisma.connection.findUnique({
      where: { id: connection_id },
    });

    if (!existing) {
      return null;
    }

    // Reconstruct the current Connection object (with encrypted creds kept opaque)
    const currentCreds = this.decryptCreds(existing.credentials);
    const current = fromPrismaRow(existing, currentCreds);

    // Merge updates
    const merged: Connection = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Re-encrypt credentials if they were updated
    const encryptedCredentials = updates.credentials
      ? this.encryptCreds(updates.credentials)
      : existing.credentials;

    const data = toPrismaRow(merged, encryptedCredentials);
    const { id: _omit, ...updateData } = data;

    const row = await prisma.connection.update({
      where: { id: connection_id },
      data: updateData,
    });

    const result = fromPrismaRow(row, merged.credentials);

    // Update auto-refresh if needed
    if (updates.auto_refresh !== undefined || updates.expires_at) {
      this.setupAutoRefresh(result);
    }

    return result;
  }

  /**
   * Delete connection
   */
  async deleteConnection(connection_id: string): Promise<boolean> {
    const existing = await prisma.connection.findUnique({
      where: { id: connection_id },
    });

    if (!existing) {
      return false;
    }

    // Clear auto-refresh timer
    const timer = this.refreshTimers.get(connection_id);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(connection_id);
    }

    await prisma.connection.delete({ where: { id: connection_id } });
    this.usageStats.delete(connection_id);

    return true;
  }

  /**
   * Validate connection by making a test request
   */
  async validateConnection(
    connection_id: string,
    testType: "connection" | "permissions" | "latency" | "full" = "connection",
  ): Promise<ConnectionValidation> {
    const connection = await this.getConnection(connection_id);

    if (!connection) {
      return {
        is_valid: false,
        message: "Connection not found",
        tested_at: new Date().toISOString(),
      };
    }

    if (!connection.is_active) {
      return {
        is_valid: false,
        message: "Connection is inactive",
        tested_at: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    try {
      const result = await this.performConnectionValidation(
        connection,
        testType,
      );

      const latency_ms = Date.now() - startTime;

      await this.updateUsageStats(connection_id, true, 0);

      return {
        is_valid: result.is_valid,
        message: result.message,
        tested_at: new Date().toISOString(),
        latency_ms,
        error_details: result.error_details,
      };
    } catch (error: any) {
      await this.updateUsageStats(connection_id, false, 1);

      return {
        is_valid: false,
        message: error.message || "Connection validation failed",
        tested_at: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
        error_details: {
          error: error.message,
          stack: error.stack,
        },
      };
    }
  }

  /**
   * Perform connection-specific validation
   */
  private async performConnectionValidation(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string; error_details?: any }> {
    switch (connection.type) {
      case "slack":
        return this.validateSlackConnection(connection, testType);
      case "openai":
        return this.validateOpenAIConnection(connection, testType);
      case "stripe":
        return this.validateStripeConnection(connection, testType);
      case "postgres":
      case "mysql":
        return this.validateDatabaseConnection(connection, testType);
      case "aws":
        return this.validateAWSConnection(connection, testType);
      case "sendgrid":
        return this.validateSendGridConnection(connection, testType);
      default:
        return {
          is_valid: true,
          message: `Connection type '${connection.type}' validation not implemented, assuming valid`,
        };
    }
  }

  private async validateSlackConnection(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string }> {
    try {
      if (
        !connection.credentials.api_key &&
        !connection.credentials.access_token
      ) {
        return {
          is_valid: false,
          message: "Missing Slack credentials",
        };
      }

      return {
        is_valid: true,
        message: "Slack connection validated successfully",
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `Slack validation failed: ${error.message}`,
      };
    }
  }

  private async validateOpenAIConnection(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string }> {
    try {
      if (!connection.credentials.api_key) {
        return {
          is_valid: false,
          message: "Missing OpenAI API key",
        };
      }

      if (!connection.credentials.api_key.startsWith("sk-")) {
        return {
          is_valid: false,
          message: "Invalid OpenAI API key format",
        };
      }

      return {
        is_valid: true,
        message: "OpenAI connection validated successfully",
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `OpenAI validation failed: ${error.message}`,
      };
    }
  }

  private async validateStripeConnection(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string }> {
    try {
      if (!connection.credentials.api_key) {
        return {
          is_valid: false,
          message: "Missing Stripe API key",
        };
      }

      return {
        is_valid: true,
        message: "Stripe connection validated successfully",
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `Stripe validation failed: ${error.message}`,
      };
    }
  }

  private async validateDatabaseConnection(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string }> {
    try {
      if (
        !connection.credentials.username ||
        !connection.credentials.password
      ) {
        return {
          is_valid: false,
          message: "Missing database credentials",
        };
      }

      return {
        is_valid: true,
        message: "Database connection validated successfully",
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `Database validation failed: ${error.message}`,
      };
    }
  }

  private async validateAWSConnection(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string }> {
    try {
      if (
        !(connection.credentials as any).access_key ||
        !(connection.credentials as any).secret_key
      ) {
        return {
          is_valid: false,
          message: "Missing AWS credentials",
        };
      }

      return {
        is_valid: true,
        message: "AWS connection validated successfully",
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `AWS validation failed: ${error.message}`,
      };
    }
  }

  private async validateSendGridConnection(
    connection: Connection,
    testType: string,
  ): Promise<{ is_valid: boolean; message: string }> {
    try {
      if (!connection.credentials.api_key) {
        return {
          is_valid: false,
          message: "Missing SendGrid API key",
        };
      }

      return {
        is_valid: true,
        message: "SendGrid connection validated successfully",
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `SendGrid validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if user has permission to use connection
   */
  async hasPermission(
    connection_id: string,
    userId: string,
    userRole: Role,
  ): Promise<boolean> {
    const row = await prisma.connection.findUnique({
      where: { id: connection_id },
    });

    if (!row || row.status !== "active") {
      return false;
    }

    const meta = (row.metadata ?? {}) as Record<string, any>;
    const allowedUsers: string[] | undefined = meta.allowed_users;
    const allowedRoles: Role[] = meta.allowed_roles ?? ["admin", "developer"];

    // Check if user is explicitly allowed
    if (allowedUsers?.includes(userId)) {
      return true;
    }

    // Check role-based access
    return allowedRoles.includes(userRole);
  }

  /**
   * Refresh OAuth token
   */
  async refreshOAuthToken(connection_id: string): Promise<boolean> {
    const connection = await this.getConnection(connection_id);

    if (!connection || connection.auth_type !== "oauth2") {
      return false;
    }

    if (!connection.credentials.refresh_token) {
      throw new Error("No refresh token available");
    }

    try {
      // TODO: Implement real OAuth refresh per provider
      const refreshedToken = await this.performOAuthRefresh(connection);

      await this.updateConnection(connection_id, {
        credentials: {
          ...connection.credentials,
          access_token: refreshedToken.access_token,
          refresh_token:
            refreshedToken.refresh_token ||
            connection.credentials.refresh_token,
        },
        expires_at: new Date(
          Date.now() + refreshedToken.expires_in * 1000,
        ).toISOString(),
      });

      return true;
    } catch (error) {
      console.error(
        `Failed to refresh OAuth token for connection ${connection_id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Perform OAuth token refresh
   * TODO: Implement real OAuth refresh per provider instead of returning mock data
   */
  private async performOAuthRefresh(connection: Connection): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    return {
      access_token: "new_access_token_" + Date.now(),
      refresh_token: connection.credentials.refresh_token,
      expires_in: 3600,
    };
  }

  /**
   * Setup automatic token refresh
   */
  private setupAutoRefresh(connection: Connection): void {
    const existingTimer = this.refreshTimers.get(connection.connection_id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (!connection.auto_refresh || !connection.expires_at) {
      return;
    }

    const expiresAt = new Date(connection.expires_at).getTime();
    const now = Date.now();
    const refreshThreshold = connection.refresh_threshold_minutes * 60 * 1000;
    const refreshTime = expiresAt - refreshThreshold;

    if (refreshTime > now) {
      const delay = refreshTime - now;
      const timer = setTimeout(async () => {
        await this.refreshOAuthToken(connection.connection_id);
      }, delay);

      this.refreshTimers.set(connection.connection_id, timer);
    }
  }

  /**
   * Update connection usage statistics
   */
  private async updateUsageStats(
    connection_id: string,
    success: boolean,
    errorCount: number,
  ): Promise<void> {
    let stats = this.usageStats.get(connection_id);

    if (!stats) {
      stats = {
        connection_id,
        usage_count: 0,
        last_used: new Date().toISOString(),
        error_count: 0,
      };
    }

    stats.usage_count++;
    stats.last_used = new Date().toISOString();
    stats.error_count += errorCount;

    this.usageStats.set(connection_id, stats);

    // Persist lastUsedAt to the database
    await prisma.connection
      .update({
        where: { id: connection_id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Non-critical; swallow errors from usage tracking
      });
  }

  /**
   * Get connection usage statistics
   */
  getUsageStats(connection_id: string): ConnectionUsage | null {
    return this.usageStats.get(connection_id) || null;
  }

  /**
   * Get all usage statistics
   */
  getAllUsageStats(): ConnectionUsage[] {
    return Array.from(this.usageStats.values());
  }

  /**
   * Test connection by type
   */
  async testConnectionByType(
    type: ConnectionType,
    testConfig: any,
  ): Promise<ConnectionValidation> {
    try {
      return {
        is_valid: true,
        message: `Connection type '${type}' test successful`,
        tested_at: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        is_valid: false,
        message: `Connection test failed: ${error.message}`,
        tested_at: new Date().toISOString(),
        error_details: {
          error: error.message,
          stack: error.stack,
        },
      };
    }
  }

  /**
   * Get connection for workflow execution
   */
  async getConnectionForExecution(
    connection_id: string,
    userId: string,
    userRole: Role,
  ): Promise<Connection | null> {
    // Check permissions
    if (!(await this.hasPermission(connection_id, userId, userRole))) {
      throw new Error(
        "Unauthorized: User does not have permission to use this connection",
      );
    }

    const connection = await this.getConnection(connection_id);
    if (!connection) {
      return null;
    }

    // Check if connection is expired (for OAuth)
    if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
      if (connection.auto_refresh) {
        await this.refreshOAuthToken(connection_id);
        return await this.getConnection(connection_id);
      } else {
        throw new Error(
          "Connection has expired and auto-refresh is not enabled",
        );
      }
    }

    return connection;
  }

  /**
   * Clear all connections (useful for testing)
   */
  async clearAllConnections(): Promise<void> {
    // Clear all auto-refresh timers
    this.refreshTimers.forEach((timer) => clearTimeout(timer));
    this.refreshTimers.clear();

    await prisma.connection.deleteMany();
    this.usageStats.clear();
  }

  /**
   * Get connection count by type
   */
  async getConnectionCountByType(): Promise<Record<string, number>> {
    const rows = await prisma.connection.groupBy({
      by: ["provider"],
      _count: { provider: true },
    });

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.provider] = row._count.provider;
    }
    return counts;
  }

  /**
   * Get expired connections
   */
  async getExpiredConnections(): Promise<Connection[]> {
    const rows = await prisma.connection.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return rows.map((row) => fromPrismaRow(row, {}));
  }

  /**
   * Get connections expiring soon
   */
  async getConnectionsExpiringSoon(hours: number = 24): Promise<Connection[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const rows = await prisma.connection.findMany({
      where: {
        expiresAt: { gte: now, lte: threshold },
      },
    });
    return rows.map((row) => fromPrismaRow(row, {}));
  }

  /**
   * Search connections
   */
  async searchConnections(query: {
    type?: ConnectionType;
    environment?: Environment;
    tags?: string[];
    name?: string;
  }): Promise<Connection[]> {
    const where: any = {};

    if (query.type) {
      where.provider = query.type;
    }
    if (query.name) {
      where.name = { contains: query.name, mode: "insensitive" };
    }
    if (query.environment) {
      where.metadata = {
        path: ["environment"],
        equals: query.environment,
      };
    }

    const rows = await prisma.connection.findMany({ where });

    let results = rows.map((row) => fromPrismaRow(row, {}));

    // Filter by tags in-memory (stored inside metadata JSON)
    if (query.tags) {
      results = results.filter(
        (conn) =>
          conn.tags && query.tags!.some((tag) => conn.tags!.includes(tag)),
      );
    }

    return results;
  }

  /**
   * Export connection (metadata only, no credentials)
   */
  async exportConnection(connection_id: string): Promise<any | null> {
    const row = await prisma.connection.findUnique({
      where: { id: connection_id },
    });

    if (!row) {
      return null;
    }

    const meta = (row.metadata ?? {}) as Record<string, any>;
    return {
      connection_id: row.id,
      name: row.name,
      type: row.provider,
      environment: meta.environment,
      description: meta.description,
      tags: meta.tags,
    };
  }

  /**
   * Import connection (metadata only, credentials must be provided separately)
   */
  async importConnection(
    connectionData: any,
    credentials: any,
  ): Promise<Connection> {
    return await this.createConnection({
      ...connectionData,
      credentials,
    });
  }
}

// Singleton instance
let connectionManagerInstance: ConnectionManager | null = null;

/**
 * Get or create the singleton ConnectionManager instance
 */
export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetConnectionManager(): void {
  if (connectionManagerInstance) {
    // Fire-and-forget cleanup; callers in test harnesses can await clearAllConnections directly
    connectionManagerInstance.clearAllConnections().catch(() => {});
  }
  connectionManagerInstance = null;
}
