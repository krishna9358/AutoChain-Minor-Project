# Zapify Project Makefile
# This Makefile provides commands to manage the Zapify microservices architecture

.PHONY: help install dev start stop clean logs db-setup kafka-setup

# Default target
help:
	@echo "Zapify Project Commands:"
	@echo ""
	@echo "Setup Commands:"
	@echo "  install     - Install dependencies for all services"
	@echo "  db-setup    - Start PostgreSQL database with Docker"
	@echo "  kafka-setup - Start Kafka with Docker"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev         - Start all services in development mode"
	@echo "  start       - Start all services (production mode)"
	@echo ""
	@echo "Individual Service Commands:"
	@echo "  dev-backend - Start primary backend only"
	@echo "  dev-frontend- Start frontend only"
	@echo "  dev-hooks   - Start hooks service only"
	@echo "  dev-worker  - Start worker service only"
	@echo "  dev-processor- Start processor service only"
	@echo ""
	@echo "Utility Commands:"
	@echo "  stop        - Stop all running services"
	@echo "  clean       - Clean build artifacts and node_modules"
	@echo "  logs        - Show logs for all services"
	@echo "  db-reset    - Reset database and run migrations"
	@echo ""

# Installation commands
install:
	@echo "Installing dependencies for all services..."
	cd primary-backend && npm install
	cd frontend && npm install
	cd hooks && npm install
	cd worker && npm install
	cd processor && npm install
	@echo "All dependencies installed!"

# Docker setup commands
db-setup:
	@echo "Starting PostgreSQL database..."
	docker run -d \
		--name zapify-postgres \
		-e POSTGRES_DB=postgres \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=mysecretpassword \
		-p 5432:5432 \
		postgres:latest
	@echo "PostgreSQL started on port 5432"

kafka-setup:
	@echo "Starting Kafka and Zookeeper..."
	docker run -d \
		--name zapify-kafka \
		-p 9092:9092 \
		apache/kafka:latest
	@echo "Kafka started on port 9092"

kafka-create-topic:
	@echo "Creating topic zap-events..."
	docker exec -it zapify-kafka \
		/opt/kafka/bin/kafka-topics.sh \
		--create \
		--topic zap-events \
		--bootstrap-server localhost:9092 \
		--partitions 3 \
		--replication-factor 1
	@echo "Topic zap-events created ✅"
# Database management
db-reset:
	@echo "Resetting database..."
	cd primary-backend && npx prisma migrate reset --force
	cd hooks && npx prisma migrate reset --force
	@echo "Database reset complete!"

db-migrate:
	@echo "Running database migrations..."
	cd primary-backend && npx prisma migrate dev
	cd primary-backend && npx prisma db seed
	cd hooks && npx prisma generate
	cd worker && npx prisma generate
	cd processor && npx prisma generate
	@echo "Migrations complete!"

# Development commands
dev: install db-setup kafka-setup kafka-create-topic db-migrate
	@echo "Starting all services in development mode..."
	@echo "Make sure to run 'make db-setup' and 'make kafka-setup' first!"
	@echo ""
	@echo "Starting services in background..."
	@echo "Use 'make logs' to view logs or 'make stop' to stop all services"
	@echo ""
	cd primary-backend && npm run dev &
	cd frontend && npm run dev &
	cd hooks && npm run dev &
	cd worker && npm run dev &
	cd processor && npm run dev &
	@echo "All services started! Frontend should be available at http://localhost:3000"

# Individual service development commands
dev-backend:
	@echo "Starting primary backend..."
	cd primary-backend && npm run dev

dev-frontend:
	@echo "Starting frontend..."
	cd frontend && npm run dev

dev-hooks:
	@echo "Starting hooks service..."
	cd hooks && npm run dev

dev-worker:
	@echo "Starting worker service..."
	cd worker && npm run dev

dev-processor:
	@echo "Starting processor service..."
	cd processor && npm run dev

# Production commands
start:
	@echo "Starting all services in production mode..."
	cd primary-backend && npm start &
	cd frontend && npm start &
	cd hooks && npm start &
	cd worker && npm start &
	cd processor && npm start &

# Utility commands
stop:
	@echo "Stopping all services..."
	@echo "Stopping Node.js processes..."
	-pkill -f "node dist/index.js"
	-pkill -f "next dev"
	-pkill -f "next start"
	@echo "Stopping Docker containers..."
	-docker stop zapify-postgres zapify-kafka zapify-kafka
	-docker rm zapify-postgres zapify-kafka zapify-kafka
	@echo "All services stopped!"

clean:
	@echo "Cleaning build artifacts and dependencies..."
	cd primary-backend && rm -rf node_modules dist
	cd frontend && rm -rf node_modules .next
	cd hooks && rm -rf node_modules dist
	cd worker && rm -rf node_modules dist
	cd processor && rm -rf node_modules dist
	@echo "Clean complete!"

logs:
	@echo "Showing logs for all services..."
	@echo "Use Ctrl+C to exit"
	@echo ""
	@echo "=== Primary Backend Logs ==="
	@echo "=== Frontend Logs ==="
	@echo "=== Hooks Logs ==="
	@echo "=== Worker Logs ==="
	@echo "=== Processor Logs ==="
	@echo ""
	@echo "Note: Run individual services to see their logs, or check Docker logs:"
	@echo "  docker logs zapify-postgres"
	@echo "  docker logs zapify-kafka"

# Quick setup for new developers
setup: db-setup kafka-setup install db-migrate
	@echo ""
	@echo "Setup complete! You can now run:"
	@echo "  make dev    - Start all services in development mode"
	@echo "  make logs   - View service logs"
	@echo "  make stop   - Stop all services"
