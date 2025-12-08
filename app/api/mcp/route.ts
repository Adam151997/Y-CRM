/**
 * MCP Server API
 * 
 * POST /api/mcp - Handle JSON-RPC messages
 * GET /api/mcp - Server info
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { 
  getMCPServer, 
  initializeMCPServer, 
  getToolRegistry, 
  registerInternalTools,
  Y_CRM_SERVER_INFO,
  LATEST_PROTOCOL_VERSION,
} from "@/lib/mcp";

// Initialize MCP server
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    const server = initializeMCPServer();
    const registry = getToolRegistry();
    registerInternalTools(registry);

    // Register tools with the server
    for (const tool of registry.getAllTools()) {
      if (tool.source === "internal") {
        server.registerTool(
          tool.name,
          tool.description || "",
          tool.inputSchema,
          async (args, context) => {
            const result = await registry.execute(tool.name, args, context);
            return {
              success: result.success,
              data: result.content,
              error: result.success ? undefined : result.content,
            };
          }
        );
      }
    }

    initialized = true;
    console.log(`[MCP API] Server initialized with ${server.toolCount} tools`);
  }
}

/**
 * GET /api/mcp - Server info and available tools
 */
export async function GET(request: NextRequest) {
  ensureInitialized();
  const server = getMCPServer();
  const registry = getToolRegistry();

  return NextResponse.json({
    server: Y_CRM_SERVER_INFO,
    protocol: LATEST_PROTOCOL_VERSION,
    endpoints: {
      sse: "/api/mcp/sse",
      messages: "/api/mcp",
    },
    tools: registry.getAllTools().map(t => ({
      name: t.name,
      description: t.description,
      source: t.source,
    })),
    connections: server.connectionCount,
  });
}

/**
 * POST /api/mcp - Handle JSON-RPC messages
 */
export async function POST(request: NextRequest) {
  try {
    // Get session ID from header
    const sessionId = request.headers.get("X-Session-ID");
    if (!sessionId) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          id: null,
          error: { 
            code: -32600, 
            message: "X-Session-ID header required. Connect to /api/mcp/sse first." 
          }
        },
        { status: 400 }
      );
    }

    // Authenticate
    const auth = await getApiAuthContext();
    if (!auth) {
      // For MCP clients without Clerk auth, use API key
      const apiKey = request.headers.get("X-API-Key");
      if (!apiKey) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: { code: -1, message: "Authentication required" }
          },
          { status: 401 }
        );
      }
      
      // TODO: Validate API key and get org/user from database
      // For now, use placeholder values for development
      const devAuth = {
        orgId: "dev_org",
        userId: "dev_user",
      };
      
      return handleMessage(request, sessionId, devAuth);
    }

    return handleMessage(request, sessionId, auth);
  } catch (error) {
    console.error("[MCP API] POST error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { 
          code: -32603, 
          message: error instanceof Error ? error.message : "Internal error" 
        }
      },
      { status: 500 }
    );
  }
}

async function handleMessage(
  request: NextRequest, 
  sessionId: string, 
  auth: { orgId: string; userId: string }
) {
  ensureInitialized();
  const server = getMCPServer();

  // Check if connection exists
  const connection = server.getConnection(sessionId);
  if (!connection) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { 
          code: -32001, 
          message: "Session not found. Connect to /api/mcp/sse first." 
        }
      },
      { status: 404 }
    );
  }

  // Parse JSON-RPC message
  let message;
  try {
    message = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid JSON" }
      },
      { status: 400 }
    );
  }

  // Validate JSON-RPC structure
  if (!message.jsonrpc || message.jsonrpc !== "2.0") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: message.id || null,
        error: { code: -32600, message: "Invalid Request: missing jsonrpc version" }
      },
      { status: 400 }
    );
  }

  // Handle the message
  const response = await server.handleMessageDirect(
    sessionId,
    message,
    { orgId: auth.orgId, userId: auth.userId }
  );

  // Return response (may be null for notifications)
  if (response) {
    return NextResponse.json(response);
  }

  return new Response(null, { status: 204 });
}

/**
 * OPTIONS /api/mcp - CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, X-Session-ID",
      "Access-Control-Max-Age": "86400",
    },
  });
}
