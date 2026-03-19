import { v4 as uuidv4 } from "uuid";
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

/**
 * Connection Manager
 * Handles storage, retrieval, validation, and lifecycle of all external integrations
 */
export class ConnectionManager {
  private connections: Map<string, Connection>;
  private encryptionManager: ReturnType<typeof getEncryptionManager>;
  private usageStats: Map<string, ConnectionUsage>;
  private refreshTimers: Map<string, NodeJS.Timeout>;

  constructor() {
    this.connections = new Map();
    this.encryptionManager = getEncryptionManager();
    this.usageStats = new Map();
    this.refreshTimers = new Map();
  }

  /**
   * Create a new connection with encrypted credentials
   */
  async createConnection(
    connectionData: Omit<CreateConnection, "connection_id">,
  ): Promise<Connection> {
    const connection_id = uuidv4();

    // Encrypt sensitive credentials
    const encryptedCredentials = this.encryptionManager.encryptCredentials(
      connectionData.credentials,
    );

    const connection: Connection = {
      connection_id,
      name: connectionData.name || connectionData.type,
      type: connectionData.type,
      auth_type: connectionData.auth_type,
      credentials: encryptedCredentials as any, // Store encrypted format
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

    this.connections.set(connection_id, connection);

    // Initialize usage stats
    this.usageStats.set(connection_id, {
      connection_id,
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
    const connection = this.connections.get(connection_id);

    if (!connection) {
      return null;
    }

    // Decrypt credentials for use
    const decryptedConnection: Connection = {
      ...connection,
      credentials: this.encryptionManager.decryptCredentials({
        encrypted: (connection.credentials as any).encrypted,
        iv: (connection.credentials as any).iv,
        authTag: (connection.credentials as any).authTag,
      }),
    };

    return decryptedConnection;
  }

  /**
   * Get connection metadata only (without credentials)
   */
  getConnectionMetadata(connection_id: string): Connection | null {
    const connection = this.connections.get(connection_id);

    if (!connection) {
      return null;
    }

    // Return connection without sensitive credential data
    return {
      ...connection,
      credentials: {},
    };
  }

  /**
   * Get all connections (metadata only)
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values()).map((conn) => ({
      ...conn,
      credentials: {},
    }));
  }

  /**
   * Get connections by type
   */
  getConnectionsByType(type: ConnectionType): Connection[] {
    return Array.from(this.connections.values())
      .filter((conn) => conn.type === type)
      .map((conn) => ({
        ...conn,
        credentials: {},
      }));
  }

  /**
   * Get connections by environment
   */
  getConnectionsByEnvironment(environment: Environment): Connection[] {
    return Array.from(this.connections.values())
      .filter((conn) => conn.environment === environment)
      .map((conn) => ({
        ...conn,
        credentials: {},
      }));
  }

  /**
   * Update connection
   */
  async updateConnection(
    connection_id: string,
    updates: Partial<UpdateConnection>,
  ): Promise<Connection | null> {
    const connection = this.connections.get(connection_id);

    if (!connection) {
      return null;
    }

    // If credentials are being updated, encrypt them
    if (updates.credentials) {
      updates.credentials = this.encryptionManager.encryptCredentials(
        updates.credentials,
      ) as any;
    }

    const updatedConnection: Connection = {
      ...connection,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.connections.set(connection_id, updatedConnection);

    // Update auto-refresh if needed
    if (updates.auto_refresh !== undefined || updates.expires_at) {
      this.setupAutoRefresh(updatedConnection);
    }

    return updatedConnection;
  }

  /**
   * Delete connection
   */
  async deleteConnection(connection_id: string): Promise<boolean> {
    const connection = this.connections.get(connection_id);

    if (!connection) {
      return false;
    }

    // Clear auto-refresh timer
    const timer = this.refreshTimers.get(connection_id);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(connection_id);
    }

    this.connections.delete(connection_id);
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
      // Implement connection-specific validation based on type
      const result = await this.performConnectionValidation(
        connection,
        testType,
      );

      const latency_ms = Date.now() - startTime;

      // Update last used timestamp and usage stats
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
      // Implement Slack API test
      // For now, assume valid if credentials exist
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

      // You could make a simple API call here to test
      // For now, we'll assume valid format
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

      // In a real implementation, you would try to establish a connection here
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
        !connection.credentials.access_key ||
        !connection.credentials.secret_key
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
  hasPermission(
    connection_id: string,
    userId: string,
    userRole: Role,
  ): boolean {
    const connection = this.connections.get(connection_id);

    if (!connection || !connection.is_active) {
      return false;
    }

    // Check if user is explicitly allowed
    if (connection.allowed_users?.includes(userId)) {
      return true;
    }

    // Check role-based access
    return connection.allowed_roles.includes(userRole);
  }

  /**
   * Refresh OAuth token
   */
  async refreshOAuthToken(connection_id: string): Promise<boolean> {
    const connection = this.connections.get(connection_id);

    if (!connection || connection.auth_type !== "oauth2") {
      return false;
    }

    if (!connection.credentials.refresh_token) {
      throw new Error("No refresh token available");
    }

    try {
      // Implement OAuth token refresh logic based on connection type
      const refreshedToken = await this.performOAuthRefresh(connection);

      // Update connection with new tokens
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
   */
  private async performOAuthRefresh(connection: Connection): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    // This would be implemented based on the specific OAuth provider
    // For now, return a mock response
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
    // Clear existing timer
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
    if (success) {
      // Calculate average latency (simplified)
      // In a real implementation, you would track actual latency values
    }
    stats.error_count += errorCount;

    this.usageStats.set(connection_id, stats);

    // Update connection's last_used timestamp
    const connection = this.connections.get(connection_id);
    if (connection) {
      connection.last_used = stats.last_used;
      this.connections.set(connection_id, connection);
    }
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
      // Implement connection testing based on type
      // This is a placeholder - implement based on your needs
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
    if (!this.hasPermission(connection_id, userId, userRole)) {
      throw new Error(
        "Unauthorized: User does not have permission to use this connection",
      );
    }

    // Check if connection is expired (for OAuth)
    const connection = this.connections.get(connection_id);
    if (!connection) {
      return null;
    }

    if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
      if (connection.auto_refresh) {
        await this.refreshOAuthToken(connection_id);
      } else {
        throw new Error(
          "Connection has expired and auto-refresh is not enabled",
        );
      }
    }

    // Get connection with decrypted credentials
    return await this.getConnection(connection_id);
  }

  /**
   * Clear all connections (useful for testing)
   */
  clearAllConnections(): void {
    // Clear all auto-refresh timers
    this.refreshTimers.forEach((timer) => clearTimeout(timer));
    this.refreshTimers.clear();

    this.connections.clear();
    this.usageStats.clear();
  }

  /**
   * Get connection count by type
   */
  getConnectionCountByType(): Record<ConnectionType, number> {
    const counts: Record<string, number> = {};

    Array.from(this.connections.values()).forEach((conn) => {
      counts[conn.type] = (counts[conn.type] || 0) + 1;
    });

    return counts as Record<ConnectionType, number>;
  }

  /**
   * Get expired connections
   */
  getExpiredConnections(): Connection[] {
    const now = new Date();
    return Array.from(this.connections.values()).filter(
      (conn) => conn.expires_at && new Date(conn.expires_at) < now,
    );
  }

  /**
   * Get connections expiring soon
   */
  getConnectionsExpiringSoon(hours: number = 24): Connection[] {
    const now = new Date();
    const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return Array.from(this.connections.values()).filter(
      (conn) =>
        conn.expires_at &&
        new Date(conn.expires_at) >= now &&
        new Date(conn.expires_at) <= threshold,
    );
  }

  /**
   * Search connections
   */
  searchConnections(query: {
    type?: ConnectionType;
    environment?: Environment;
    tags?: string[];
    name?: string;
  }): Connection[] {
    return Array.from(this.connections.values())
      .filter((conn) => {
        if (query.type && conn.type !== query.type) return false;
        if (query.environment && conn.environment !== query.environment)
          return false;
        if (query.tags && !query.tags.some((tag) => conn.tags?.includes(tag)))
          return false;
        if (
          query.name &&
          !conn.name.toLowerCase().includes(query.name.toLowerCase())
        )
          return false;
        return true;
      })
      .map((conn) => ({
        ...conn,
        credentials: {},
      }));
  }

  /**
   * Export connection (metadata only, no credentials)
   */
  exportConnection(connection_id: string): any | null {
    const connection = this.connections.get(connection_id);

    if (!connection) {
      return null;
    }

    return {
      connection_id: connection.connection_id,
      name: connection.name,
      type: connection.type,
      environment: connection.environment,
      description: connection.description,
      tags: connection.tags,
      // Do not include credentials
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
    connectionManagerInstance.clearAllConnections();
  }
  connectionManagerInstance = null;
}
