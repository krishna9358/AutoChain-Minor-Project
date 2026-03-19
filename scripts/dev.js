#!/usr/bin/env node

/**
 * AgentFlow AI — Unified Development Command
 *
 * Usage: node scripts/dev.js [command]
 *
 * Commands:
 *   dev     - Start all services (default)
 *   up      - Start all services
 *   down    - Stop all services
 *   reset   - Stop, remove volumes, and rebuild
 *   logs    - View logs from all services
 *   status  - Show service status
 *   build   - Build all services
 *   clean   - Clean up unused Docker resources
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = "white") {
  console.log(colorize(message, color));
}

function success(message) {
  log(`✓ ${message}`, "green");
}

function error(message) {
  log(`✗ ${message}`, "red");
}

function warning(message) {
  log(`⚠ ${message}`, "yellow");
}

function info(message) {
  log(`ℹ ${message}`, "cyan");
}

// Project root directory
const projectRoot = path.join(__dirname, "..");

// Services configuration
const services = [
  {
    name: "postgres",
    label: "Database",
    port: 5432,
    healthCheck: "pg_isready",
  },
  { name: "kafka", label: "Kafka", port: 9094, healthCheck: "kafka-topics" },
  {
    name: "backend",
    label: "Backend API",
    port: 3001,
    url: "http://localhost:3001",
  },
  {
    name: "hooks",
    label: "Webhook Receiver",
    port: 3002,
    url: "http://localhost:3002",
  },
  {
    name: "processor",
    label: "Event Processor",
    dependsOn: ["kafka", "postgres"],
  },
  {
    name: "worker",
    label: "Workflow Worker",
    dependsOn: ["kafka", "postgres"],
  },
  {
    name: "frontend",
    label: "Frontend",
    port: 3000,
    url: "http://localhost:3000",
  },
];

// Environment templates
const envTemplates = {
  "primary-backend": {
    DATABASE_URL: "postgresql://postgres:agentflow_dev@postgres:5432/agentflow",
    JWT_SECRET: "agentflow-dev-secret-key",
    PORT: "3001",
    KAFKA_BROKER: "kafka:9092",
    NODE_ENV: "development",
  },
  frontend: {
    NEXT_PUBLIC_BACKEND_URL: "http://localhost:3001",
    NEXT_PUBLIC_DEV_MODE: "true",
    NEXT_PUBLIC_DEV_TOKEN: "dev-demo-token",
  },
  hooks: {
    DATABASE_URL: "postgresql://postgres:agentflow_dev@postgres:5432/agentflow",
    PORT: "3002",
    NODE_ENV: "development",
  },
  processor: {
    DATABASE_URL: "postgresql://postgres:agentflow_dev@postgres:5432/agentflow",
    KAFKA_BROKER: "kafka:9092",
    NODE_ENV: "development",
  },
  worker: {
    DATABASE_URL: "postgresql://postgres:agentflow_dev@postgres:5432/agentflow",
    KAFKA_BROKER: "kafka:9092",
    NODE_ENV: "development",
  },
};

function checkDocker() {
  try {
    execSync("docker --version", { stdio: "pipe" });
    execSync("docker compose version", { stdio: "pipe" });
    return true;
  } catch (err) {
    error("Docker or Docker Compose is not installed or not running");
    info("Please install Docker and Docker Compose to use this tool");
    process.exit(1);
  }
}

function ensureEnvFiles() {
  log("\n📝 Checking environment files...", "cyan");

  Object.keys(envTemplates).forEach((service) => {
    const envPath = path.join(projectRoot, service, ".env");

    if (!fs.existsSync(envPath)) {
      info(`Creating ${service}/.env`);
      const envContent = Object.entries(envTemplates[service])
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
      fs.writeFileSync(envPath, envContent);
      success(`Created ${service}/.env`);
    } else {
      success(`${service}/.env already exists`);
    }
  });
}

function runComposeCommand(command) {
  try {
    execSync(`cd "${projectRoot}" && docker compose ${command}`, {
      stdio: "inherit",
      env: { ...process.env },
    });
  } catch (err) {
    error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function banner() {
  console.log(
    "\n" +
      colorize(
        "╔══════════════════════════════════════════════════════════╗",
        "cyan",
      ),
  );
  console.log(
    colorize("║  ", "cyan") +
      colorize("⚡ AgentFlow AI ", "blue") +
      colorize("— Development Environment", "cyan") +
      "               ║",
  );
  console.log(
    colorize(
      "╚══════════════════════════════════════════════════════════╝",
      "cyan",
    ),
  );
  console.log("");
}

function showServiceUrls() {
  log("\n🌐 Service URLs:", "cyan");
  services
    .filter((s) => s.url)
    .forEach((service) => {
      log(`  ${service.label.padEnd(18)} ${colorize(service.url, "green")}`);
    });
}

function cmdUp() {
  banner();
  checkDocker();
  ensureEnvFiles();

  log("\n🚀 Starting all services...", "cyan");

  // Start services
  runComposeCommand("up -d --build");

  log("\n⏳ Waiting for services to be healthy...", "yellow");

  // Wait for services to be healthy
  setTimeout(() => {
    console.log("");
    console.log(
      colorize(
        "╔════════════════════════════════════════════════════════════════╗",
        "green",
      ),
    );
    console.log(
      colorize(
        "║  🚀 Enterprise No-Code Workflow Studio - Services Started     ║",
        "green",
      ),
    );
    console.log(
      colorize(
        "╚════════════════════════════════════════════════════════════════╝",
        "green",
      ),
    );
    console.log("");
    log("📦 RUNNING SERVICES:", "cyan");
    console.log(
      colorize(
        "  ┌─────────────────────────────────────────────────────────┐",
        "cyan",
      ),
    );
    console.log(
      colorize(
        "  │ 🎨 Frontend          : " + "http://localhost:3000           ",
        "green",
      ) + "│",
    );
    console.log(
      colorize(
        "  │ 🔧 Backend API       : " + "http://localhost:3001           ",
        "green",
      ) + "│",
    );
    console.log(
      colorize(
        "  │ 🪝 Webhook Receiver  : " + "http://localhost:3002           ",
        "green",
      ) + "│",
    );
    console.log(
      colorize(
        "  │ 🐘 PostgreSQL DB     : " + "localhost:5432                  ",
        "green",
      ) + "│",
    );
    console.log(
      colorize(
        "  │ 📨 Kafka Broker      : " + "localhost:9092, localhost:9094 ",
        "green",
      ) + "│",
    );
    console.log(
      colorize(
        "  └─────────────────────────────────────────────────────────┘",
        "cyan",
      ),
    );
    console.log("");
    log("📋 WHAT EACH SERVICE DOES:", "cyan");
    console.log(
      "  • Frontend       : Next.js UI for workflow editor & dashboard",
    );
    console.log(
      "  • Backend        : REST API for workflows, secrets, API keys",
    );
    console.log(
      "  • Hooks          : Receives external webhooks & forwards to Kafka",
    );
    console.log("  • Processor      : Reads DB changes and publishes to Kafka");
    console.log(
      "  • Worker         : Consumes Kafka events and executes actions",
    );
    console.log("  • PostgreSQL     : Persists workflows, secrets, API keys");
    console.log("  • Kafka          : Event streaming between microservices");
    console.log("");
    log("⚡ QUICK COMMANDS:", "yellow");
    console.log("  • View logs      : node scripts/dev.js logs");
    console.log("  • Stop all       : node scripts/dev.js down");
    console.log("  • Restart service: docker compose restart [service-name]");
    console.log("  • Shell access   : docker compose exec [service-name] sh");
    console.log("  • Show status    : node scripts/dev.js status");
    console.log("");
    log("📖 ACCESSING THE APP:", "cyan");
    console.log("  • Open browser to: http://localhost:3000");
    console.log("  • Default dev token: dev-demo-token");
    console.log("");
    log("💡 Development mode is ON — no login required!", "yellow");
    log("💡 Source files are volume-mounted for hot reload", "yellow");
    console.log("");
    log("🛑 TO STOP ALL SERVICES:", "yellow");
    console.log("  Run: node scripts/dev.js down");
    console.log("");
    success("All services are healthy and ready!");
    console.log("");
  }, 5000);
}

function cmdDown() {
  banner();
  log("\n🛑 Stopping all services...", "cyan");
  runComposeCommand("down");
  success("All services stopped");
  console.log("");
  log(
    "💡 Tip: Run " +
      colorize("node scripts/dev.js up", "cyan") +
      " to start services again",
    "yellow",
  );
  console.log("");
}

function cmdReset() {
  banner();
  warning("This will delete all data (volumes) and rebuild everything!");

  process.stdout.write("Continue? (y/N): ");
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.once("data", (data) => {
    if (data.toString().trim().toLowerCase() === "y") {
      log("\n🔄 Resetting environment...", "cyan");
      runComposeCommand("down -v --remove-orphans");
      runComposeCommand("up -d --build --force-recreate");

      setTimeout(() => {
        success("Fresh environment is ready!");
        showServiceUrls();
        console.log("");
      }, 5000);
    } else {
      log("\nAborted", "yellow");
    }
    process.exit(0);
  });
}

function cmdLogs() {
  banner();
  log("\n📋 Streaming logs (Ctrl+C to exit)...\n", "cyan");
  runComposeCommand("logs -f --tail=50");
}

function cmdStatus() {
  banner();
  log("\n📊 Service Status:\n", "cyan");
  runComposeCommand("ps");
}

function cmdBuild() {
  banner();
  log("\n🔨 Building all services...\n", "cyan");
  runComposeCommand("build");
  success("Build complete");
}

function cmdClean() {
  banner();
  log("\n🧹 Cleaning up Docker resources...\n", "cyan");
  runComposeCommand("down --remove-orphans");
  execSync("docker system prune -f", { stdio: "inherit" });
  success("Cleanup complete");
}

// Main command handler
const command = process.argv[2] || "up";

switch (command) {
  case "dev":
  case "up":
    cmdUp();
    break;
  case "down":
    cmdDown();
    break;
  case "reset":
    cmdReset();
    break;
  case "logs":
    cmdLogs();
    break;
  case "status":
    cmdStatus();
    break;
  case "build":
    cmdBuild();
    break;
  case "clean":
    cmdClean();
    break;
  case "help":
  default:
    console.log(`
AgentFlow AI Development Command

Usage: node scripts/dev.js [command]

Commands:
  dev     Start all services (default)
  up      Start all services
  down    Stop all services
  reset   Stop, remove volumes, and rebuild
  logs    View logs from all services
  status  Show service status
  build   Build all services
  clean   Clean up unused Docker resources
  help    Show this help message

Examples:
  node scripts/dev.js dev
  node scripts/dev.js logs
  node scripts/dev.js reset
`);
    break;
}
