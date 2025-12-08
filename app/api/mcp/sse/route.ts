/**
 * MCP SSE Endpoint
 * GET /api/mcp/sse - Server-Sent Events stream for MCP
 */

import { NextRequest, NextResponse } from "next/server";
import { getMCPServer, initializeMCPServer, getToolRegistry, registerInternalTools } from "@/lib/mcp";

// Runtime config for streaming
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Initialize MCP server with tools on first request
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
    console.log(`[MCP SSE] Server initialized with ${server.toolCount} tools`);
  }
}

/**
 * GET /api/mcp/sse - SSE endpoint for MCP connections
 */
export async function GET(request: NextRequest) {
  try {
    // Get API key from query or header
    const url = new URL(request.url);
    const apiKey = url.searchParams.get("token") || request.headers.get("X-API-Key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required. Pass via ?token= or X-API-Key header" },
        { status: 401 }
      );
    }

    // TODO: Validate API key against database
    // For now, accept any non-empty key for development

    ensureInitialized();
    const server = getMCPServer();

    // Create SSE connection
    const { connection, stream } = server.createSSEConnection();

    console.log(`[MCP SSE] New connection established: ${connection.id}`);

    // Return SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Session-ID": connection.id,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "X-Session-ID",
      },
    });
  } catch (error) {
    console.error("[MCP SSE] Error:", error);
    return NextResponse.json(
      { error: "Failed to establish SSE connection" },
      { status: 500 }
    );
  }
}
