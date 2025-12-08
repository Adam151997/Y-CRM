# Y-CRM MCP Implementation

This document describes the Model Context Protocol (MCP) implementation for Y-CRM.

## Overview

Y-CRM implements both **MCP Client** and **MCP Server** capabilities:

- **MCP Server**: Exposes Y-CRM tools to external clients (Claude Desktop, other AI agents)
- **MCP Client**: Connects to external MCP servers (Composio, custom servers) to use their tools

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Y-CRM System                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        AI Agent (Orchestrator)                       │    │
│  └──────────────────────────────┬───────────────────────────────────────┘    │
│                                 │                                            │
│              ┌──────────────────┼──────────────────┐                         │
│              │                  │                  │                         │
│              ▼                  ▼                  ▼                         │
│  ┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐              │
│  │  Internal Tools   │ │  MCP Client   │ │   MCP Server      │              │
│  │  (Prisma DB)      │ │  (Outbound)   │ │   (Inbound)       │              │
│  └───────────────────┘ └───────────────┘ └───────────────────┘              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
lib/mcp/
├── protocol/           # MCP protocol types and helpers
│   ├── types.ts        # JSON-RPC 2.0, MCP message types
│   ├── errors.ts       # Error codes and factory functions
│   ├── capabilities.ts # Server/client capabilities
│   └── index.ts
│
├── client/             # MCP Client implementation
│   ├── index.ts        # MCPClient class
│   ├── session.ts      # Session management
│   └── transport/      # Transport implementations
│       ├── base.ts     # Transport interface
│       ├── sse.ts      # Server-Sent Events transport
│       └── stdio.ts    # Stdio transport (Node.js)
│
├── server/             # MCP Server implementation
│   ├── index.ts        # MCPServer class
│   ├── handler.ts      # JSON-RPC request handler
│   └── transport/      # Server transports
│       ├── base.ts
│       ├── sse.ts      # SSE for HTTP clients
│       └── stdio.ts    # Stdio for CLI clients
│
├── registry/           # Unified tool registry
│   ├── index.ts        # ToolRegistry class
│   └── internal.ts     # Y-CRM internal tools
│
└── index.ts            # Barrel exports

app/api/mcp/
├── route.ts            # POST handler for JSON-RPC messages
└── sse/
    └── route.ts        # GET handler for SSE connections

scripts/
└── mcp-server.ts       # Standalone stdio server for Claude Desktop
```

## Protocol Compliance

### JSON-RPC 2.0

All communication follows JSON-RPC 2.0:

```json
// Request
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }

// Response
{ "jsonrpc": "2.0", "id": 1, "result": { "tools": [...] } }

// Error
{ "jsonrpc": "2.0", "id": 1, "error": { "code": -32601, "message": "..." } }

// Notification (no id)
{ "jsonrpc": "2.0", "method": "notifications/initialized" }
```

### Supported MCP Methods

| Method | Description |
|--------|-------------|
| `initialize` | Capability negotiation |
| `notifications/initialized` | Client ready notification |
| `ping` | Health check |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |
| `resources/list` | List available resources |
| `resources/read` | Read a resource |

## Usage

### Using Y-CRM as an MCP Server

#### Via HTTP (SSE)

1. Connect to SSE endpoint:
```bash
curl -N "http://localhost:3000/api/mcp/sse?token=your-api-key"
```

2. Send JSON-RPC messages:
```bash
curl -X POST "http://localhost:3000/api/mcp" \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: <session-id-from-sse>" \
  -H "X-API-Key: your-api-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}'
```

#### Via Claude Desktop (Stdio)

Add to your Claude Desktop config:

**Mac/Linux**: `~/.config/claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "y-crm": {
      "command": "npx",
      "args": ["tsx", "/path/to/y-crm/scripts/mcp-server.ts"],
      "env": {
        "Y_CRM_API_URL": "http://localhost:3000",
        "Y_CRM_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Using Y-CRM as an MCP Client

```typescript
import { createMCPClient, getToolRegistry } from "@/lib/mcp";

// Connect to an external MCP server
const client = await createMCPClient({
  transport: {
    type: "sse",
    url: "https://mcp.composio.dev",
    headers: { Authorization: "Bearer ..." }
  }
});

// List tools from external server
const tools = await client.listTools();

// Call a tool
const result = await client.callTool("gmail_send", {
  to: "user@example.com",
  subject: "Hello"
});

// Or register with the unified registry
const registry = getToolRegistry();
await registry.addMCPClient("composio", client);

// Now all tools are available through the registry
const allTools = registry.getAllTools();
```

## Available Tools

Y-CRM exposes these tools via MCP:

| Tool | Description |
|------|-------------|
| `ycrm_create_lead` | Create a new lead |
| `ycrm_search_leads` | Search for leads |
| `ycrm_create_contact` | Create a new contact |
| `ycrm_create_task` | Create a new task |
| `ycrm_create_account` | Create a new account |
| `ycrm_get_dashboard` | Get CRM dashboard summary |

## Security

- API key authentication for HTTP clients
- Session-based connection management
- Org/user context for multi-tenancy
- Audit logging for all tool executions

## Adding New Tools

1. Define the tool in `lib/mcp/registry/internal.ts`:

```typescript
const myNewTool: InternalToolDefinition = {
  name: "my_new_tool",
  tool: {
    name: "ycrm_my_new_tool",
    description: "Description of what the tool does",
    inputSchema: {
      type: "object",
      properties: {
        param1: { type: "string", description: "..." }
      },
      required: ["param1"]
    }
  },
  execute: async (args, context) => {
    // Implementation
    return { success: true, data: { ... } };
  }
};
```

2. Add to the `internalTools` array.

## Testing

```bash
# Run the stdio server directly
npm run mcp:server

# Test with a simple JSON-RPC message
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run mcp:server
```

## Future Improvements

- [ ] API key management UI
- [ ] WebSocket transport
- [ ] Resource subscriptions
- [ ] Progress notifications for long operations
- [ ] Rate limiting per client
