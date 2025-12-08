#!/usr/bin/env node
/**
 * Y-CRM MCP Server (Stdio)
 * 
 * Standalone MCP server for Claude Desktop and other stdio-based clients
 * 
 * Usage:
 *   npx tsx scripts/mcp-server.ts
 * 
 * Claude Desktop config (~/.config/claude/claude_desktop_config.json on Mac/Linux):
 * Windows: %APPDATA%\Claude\claude_desktop_config.json
 * 
 * {
 *   "mcpServers": {
 *     "y-crm": {
 *       "command": "npx",
 *       "args": ["tsx", "C:/path/to/y-crm/scripts/mcp-server.ts"],
 *       "env": {
 *         "Y_CRM_API_URL": "http://localhost:3000",
 *         "Y_CRM_API_KEY": "your-api-key"
 *       }
 *     }
 *   }
 * }
 */

// MCP Protocol Constants
const LATEST_PROTOCOL_VERSION = "2024-11-05";

const Y_CRM_SERVER_INFO = {
  name: "y-crm-mcp-server",
  version: "1.0.0",
};

const DEFAULT_SERVER_CAPABILITIES = {
  tools: { listChanged: true },
  resources: { subscribe: false, listChanged: true },
  prompts: { listChanged: false },
  logging: {},
};

// Environment
const API_URL = process.env.Y_CRM_API_URL || "http://localhost:3000";
const API_KEY = process.env.Y_CRM_API_KEY || "dev-key";

// Types
interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: { name: string; version: string };
}

interface CallToolParams {
  name: string;
  arguments?: Record<string, unknown>;
}

// Buffer for incoming data
let buffer = "";

// Tool definitions
const tools: MCPTool[] = [
  {
    name: "create_lead",
    description: "Create a new lead in the CRM. Use this when the user wants to add a new lead or prospect.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Lead's first name (required)" },
        lastName: { type: "string", description: "Lead's last name (required)" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        company: { type: "string", description: "Company name" },
        title: { type: "string", description: "Job title" },
        source: {
          type: "string",
          description: "Lead source",
          enum: ["REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN", "TRADE_SHOW", "OTHER"],
        },
      },
      required: ["firstName", "lastName"],
    },
  },
  {
    name: "search_leads",
    description: "Search for leads in the CRM by name, email, company, or status.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term to match against name, email, or company" },
        status: {
          type: "string",
          description: "Filter by lead status",
          enum: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
        },
        limit: { type: "integer", description: "Maximum results (1-20)", minimum: 1, maximum: 20 },
      },
    },
  },
  {
    name: "create_contact",
    description: "Create a new contact in the CRM.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Contact's first name (required)" },
        lastName: { type: "string", description: "Contact's last name (required)" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        title: { type: "string", description: "Job title" },
        accountId: { type: "string", description: "Associated account ID" },
      },
      required: ["firstName", "lastName"],
    },
  },
  {
    name: "create_task",
    description: "Create a new task in the CRM.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title (required)" },
        description: { type: "string", description: "Task description" },
        dueDate: { type: "string", description: "Due date (ISO format)" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        leadId: { type: "string", description: "Associated lead ID" },
        contactId: { type: "string", description: "Associated contact ID" },
      },
      required: ["title"],
    },
  },
  {
    name: "create_account",
    description: "Create a new account (company) in the CRM.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Account/company name (required)" },
        industry: { type: "string", description: "Industry" },
        website: { type: "string", description: "Website URL" },
        phone: { type: "string", description: "Phone number" },
        type: { type: "string", enum: ["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"] },
      },
      required: ["name"],
    },
  },
  {
    name: "get_dashboard",
    description: "Get a summary of CRM data including lead counts, task counts, and recent activity.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Send a JSON-RPC message to stdout
 */
function send(message: JSONRPCResponse | JSONRPCNotification): void {
  const data = JSON.stringify(message) + "\n";
  process.stdout.write(data);
}

/**
 * Log to stderr (doesn't interfere with JSON-RPC on stdout)
 */
function log(message: string): void {
  process.stderr.write(`[Y-CRM MCP] ${message}\n`);
}

/**
 * Handle initialize request
 */
function handleInitialize(id: string | number, params: InitializeParams): void {
  log(`Initialize from ${params.clientInfo.name} v${params.clientInfo.version}`);

  send({
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: DEFAULT_SERVER_CAPABILITIES,
      serverInfo: Y_CRM_SERVER_INFO,
      instructions: "Y-CRM MCP Server - Manage your CRM data using natural language. Available operations: create/search leads, create contacts, create tasks, create accounts, get dashboard summary.",
    },
  });
}

/**
 * Handle list tools request
 */
function handleListTools(id: string | number): void {
  log("Listing tools");
  send({
    jsonrpc: "2.0",
    id,
    result: { tools },
  });
}

/**
 * Handle call tool request
 */
async function handleCallTool(id: string | number, params: CallToolParams): Promise<void> {
  log(`Calling tool: ${params.name}`);

  try {
    // Map tool name to API endpoint
    const endpointMap: Record<string, { method: string; path: string }> = {
      create_lead: { method: "POST", path: "/api/leads" },
      search_leads: { method: "GET", path: "/api/leads" },
      create_contact: { method: "POST", path: "/api/contacts" },
      create_task: { method: "POST", path: "/api/tasks" },
      create_account: { method: "POST", path: "/api/accounts" },
      get_dashboard: { method: "GET", path: "/api/dashboard" },
    };

    const endpoint = endpointMap[params.name];
    if (!endpoint) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Unknown tool: ${params.name}` }],
          isError: true,
        },
      });
      return;
    }

    // Build URL with query params for GET requests
    let url = `${API_URL}${endpoint.path}`;
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
    };

    if (endpoint.method === "GET" && params.arguments) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params.arguments)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    } else if (endpoint.method === "POST") {
      options.body = JSON.stringify(params.arguments || {});
    }

    log(`Calling ${endpoint.method} ${url}`);
    
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        },
      });
    } else {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `API Error: ${response.status} - ${JSON.stringify(data)}` }],
          isError: true,
        },
      });
    }
  } catch (error) {
    log(`Tool error: ${error}`);
    send({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      },
    });
  }
}

/**
 * Handle incoming JSON-RPC request
 */
async function handleRequest(request: JSONRPCRequest): Promise<void> {
  switch (request.method) {
    case "initialize":
      handleInitialize(request.id, request.params as unknown as InitializeParams);
      break;

    case "ping":
      send({ jsonrpc: "2.0", id: request.id, result: {} });
      break;

    case "tools/list":
      handleListTools(request.id);
      break;

    case "tools/call":
      await handleCallTool(request.id, request.params as unknown as CallToolParams);
      break;

    case "resources/list":
      send({ jsonrpc: "2.0", id: request.id, result: { resources: [] } });
      break;

    case "prompts/list":
      send({ jsonrpc: "2.0", id: request.id, result: { prompts: [] } });
      break;

    default:
      send({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      });
  }
}

/**
 * Handle incoming JSON-RPC notification
 */
function handleNotification(notification: JSONRPCNotification): void {
  switch (notification.method) {
    case "notifications/initialized":
      log("Client initialized");
      break;

    case "notifications/cancelled":
      log(`Request cancelled: ${JSON.stringify(notification.params)}`);
      break;

    default:
      log(`Unknown notification: ${notification.method}`);
  }
}

/**
 * Process incoming data
 */
function processData(data: string): void {
  buffer += data;

  // Process complete messages (newline-delimited JSON)
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);

        if ("id" in message && message.id !== undefined && "method" in message) {
          // Request
          handleRequest(message as JSONRPCRequest);
        } else if ("method" in message && !("id" in message)) {
          // Notification
          handleNotification(message as JSONRPCNotification);
        }
      } catch (error) {
        log(`Parse error: ${error}`);
        send({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        });
      }
    }
  }
}

/**
 * Main entry point
 */
function main(): void {
  log("Starting...");
  log(`API URL: ${API_URL}`);

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", processData);
  process.stdin.on("end", () => {
    log("Stdin closed, exiting");
    process.exit(0);
  });

  // Handle termination gracefully
  process.on("SIGINT", () => {
    log("Received SIGINT, exiting");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("Received SIGTERM, exiting");
    process.exit(0);
  });

  log("Ready for connections");
}

main();
