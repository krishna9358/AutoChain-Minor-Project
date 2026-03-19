import { z } from "zod";

// Authentication types
export const AuthTypeEnum = z.enum(["oauth2", "api_key", "basic", "bearer"]);
export type AuthType = z.infer<typeof AuthTypeEnum>;

// Connection types
export const ConnectionTypeEnum = z.enum([
  "slack",
  "stripe",
  "postgres",
  "mysql",
  "mongodb",
  "sendgrid",
  "twilio",
  "aws",
  "google",
  "openai",
  "pinecone",
  "zoom",
  "jira",
  "notion",
  "salesforce",
  "hubspot",
  "custom"
]);
export type ConnectionType = z.infer<typeof ConnectionTypeEnum>;

// Environment types
export const EnvironmentEnum = z.enum(["dev", "staging", "prod"]);
export type Environment = z.infer<typeof EnvironmentEnum>;

// Encryption types
export const EncryptionEnum = z.enum(["AES256", "RSA2048"]);
export type Encryption = z.infer<typeof EncryptionEnum>;

// Role types for RBAC
export const RoleEnum = z.enum(["admin", "developer", "viewer", "executor"]);
export type Role = z.infer<typeof RoleEnum>;

// Credentials schema
export const CredentialsSchema = z.object({
  api_key: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  bearer_token: z.string().optional(),
  webhook_secret: z.string().optional(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

// Connection schema
export const ConnectionSchema = z.object({
  connection_id: z.string().min(1),
  name: z.string().min(1),
  type: ConnectionTypeEnum,
  auth_type: AuthTypeEnum,
  credentials: CredentialsSchema,
  base_url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  expires_at: z.string().datetime().optional(),
  scopes: z.array(z.string()).optional(),
  region: z.string().optional(),
  encryption: EncryptionEnum.optional(),
  environment: EnvironmentEnum.default("dev"),
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString()),
  last_used: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // RBAC fields
  allowed_roles: z.array(RoleEnum).default(["admin", "developer"]),
  allowed_users: z.array(z.string()).optional(),
  // Auto-refresh settings
  auto_refresh: z.boolean().default(false),
  refresh_threshold_minutes: z.number().default(5),
});

export type Connection = z.infer<typeof ConnectionSchema>;

// Connection creation schema
export const CreateConnectionSchema = ConnectionSchema.partial({
  connection_id: true,
  created_at: true,
  updated_at: true,
  last_used: true,
}).required({
  type: true,
  auth_type: true,
  credentials: true,
});

export type CreateConnection = z.infer<typeof CreateConnectionSchema>;

// Connection update schema
export const UpdateConnectionSchema = ConnectionSchema.partial().extend({
  connection_id: z.string().min(1),
});

export type UpdateConnection = z.infer<typeof UpdateConnectionSchema>;

// Connection validation result
export const ConnectionValidationSchema = z.object({
  is_valid: z.boolean(),
  message: z.string(),
  tested_at: z.string().datetime(),
  latency_ms: z.number().optional(),
  error_details: z.any().optional(),
});

export type ConnectionValidation = z.infer<typeof ConnectionValidationSchema>;

// Connection usage tracking
export const ConnectionUsageSchema = z.object({
  connection_id: z.string(),
  usage_count: z.number(),
  last_used: z.string().datetime(),
  last_workflow_id: z.string().optional(),
  error_count: z.number(),
  avg_latency_ms: z.number().optional(),
});

export type ConnectionUsage = z.infer<typeof ConnectionUsageSchema>;

// OAuth configuration schema
export const OAuthConfigSchema = z.object({
  authorization_url: z.string().url(),
  token_url: z.string().url(),
  scope: z.string(),
  callback_url: z.string().url(),
  state: z.string().optional(),
  pkce: z.boolean().default(false),
});

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

// Token refresh response
export const TokenRefreshResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string().default("Bearer"),
});

export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;

// Connection test configuration
export const ConnectionTestConfigSchema = z.object({
  connection_id: z.string(),
  test_type: z.enum(["connection", "permissions", "latency", "full"]),
  timeout_ms: z.number().default(5000),
});

export type ConnectionTestConfig = z.infer<typeof ConnectionTestConfigSchema>;

// Connection error types
export const ConnectionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.string().datetime(),
  connection_id: z.string().optional(),
});

export type ConnectionError = z.infer<typeof ConnectionErrorSchema>;
