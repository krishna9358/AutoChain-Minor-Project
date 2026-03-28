#!/bin/bash
set -e

# AgentFlow AI — Database Initialization Script
# This script runs automatically when the PostgreSQL container starts for the first time

echo "🚀 Initializing AgentFlow database..."

# Create extensions
echo "📦 Creating PostgreSQL extensions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- UUID extension for generating unique IDs
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- pgcrypto for cryptographic functions
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- JSON functions (built-in in PostgreSQL 12+)
    -- No additional extension needed

    -- pg_stat_statements for query performance monitoring
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EOSQL

echo "✅ Extensions created successfully"

# Create initial tables for the outbox pattern (if not created by Prisma)
echo "📝 Creating outbox pattern tables..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Outbox table for events that need to be processed
    CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        aggregate_type VARCHAR(255) NOT NULL,
        aggregate_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(255) NOT NULL,
        event_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE,
        processed BOOLEAN DEFAULT FALSE
    );

    -- Index for querying unprocessed events
    CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed
        ON outbox_events (processed, created_at)
        WHERE processed = FALSE;

    -- Dead letter queue for failed events
    CREATE TABLE IF NOT EXISTS dead_letter_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL,
        topic VARCHAR(255) NOT NULL,
        event_data JSONB NOT NULL,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for querying DLQ entries
    CREATE INDEX IF NOT EXISTS idx_dlq_created_at
        ON dead_letter_queue (created_at DESC);
EOSQL

echo "✅ Outbox pattern tables created successfully"

# Create webhook and tracking tables
echo "📝 Creating webhook tracking tables..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Webhook tracking table
    CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        url VARCHAR(2048) NOT NULL,
        secret VARCHAR(255),
        workflow_id UUID,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Webhook delivery tracking
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(255) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(50) NOT NULL,
        response_code INTEGER,
        response_body TEXT,
        attempt_count INTEGER DEFAULT 1,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for querying webhook deliveries
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
        ON webhook_deliveries (webhook_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
        ON webhook_deliveries (status, created_at DESC);
EOSQL

echo "✅ Webhook tracking tables created successfully"

# Create performance monitoring tables
echo "📝 Creating performance monitoring tables..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Workflow execution metrics
    CREATE TABLE IF NOT EXISTS workflow_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID NOT NULL,
        run_id UUID NOT NULL,
        node_id VARCHAR(255),
        execution_time_ms BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for querying workflow metrics
    CREATE INDEX IF NOT EXISTS idx_workflow_metrics_workflow
        ON workflow_metrics (workflow_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workflow_metrics_run
        ON workflow_metrics (run_id, created_at ASC);

    -- Daily aggregation table for workflow performance
    CREATE TABLE IF NOT EXISTS workflow_performance_daily (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID NOT NULL,
        date DATE NOT NULL,
        total_executions INTEGER DEFAULT 0,
        successful_executions INTEGER DEFAULT 0,
        failed_executions INTEGER DEFAULT 0,
        avg_execution_time_ms NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(workflow_id, date)
    );

    -- Index for querying daily performance
    CREATE INDEX IF NOT EXISTS idx_workflow_performance_daily_date
        ON workflow_performance_daily (date DESC);
EOSQL

echo "✅ Performance monitoring tables created successfully"

# Create audit trail tables
echo "📝 Creating audit trail tables..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Audit log for tracking all changes
    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for querying audit logs
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user
        ON audit_logs (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
        ON audit_logs (entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action
        ON audit_logs (action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
        ON audit_logs (created_at DESC);
EOSQL

echo "✅ Audit trail tables created successfully"

# Grant necessary permissions
echo "🔐 Setting up permissions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Grant all privileges to the postgres user
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
    GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
EOSQL

echo "✅ Permissions set successfully"

echo ""
echo "🎉 Database initialization completed successfully!"
echo ""
echo "📊 Database: $POSTGRES_DB"
echo "👤 User: $POSTGRES_USER"
echo "🔌 Port: 5432"
echo ""
