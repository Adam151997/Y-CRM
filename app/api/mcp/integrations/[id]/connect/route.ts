/**
 * MCP Integration Connect/Disconnect API
 * POST: Connect to the MCP server
 * DELETE: Disconnect from the MCP server
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { getToolRegistry } from "@/lib/mcp/registry";
import { createMCPClient } from "@/lib/mcp/client";
import type { TransportConfig } from "@/lib/mcp/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/mcp/integrations/[id]/connect
 * Connect to an MCP server and register its tools
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.mCPIntegration.findFirst({
      where: { id, orgId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "MCP integration not found" },
        { status: 404 }
      );
    }

    if (!integration.isEnabled) {
      return NextResponse.json(
        { error: "MCP integration is disabled" },
        { status: 400 }
      );
    }

    // Update status to CONNECTING
    await prisma.mCPIntegration.update({
      where: { id },
      data: { status: "CONNECTING", lastError: null },
    });

    try {
      // Build transport config based on type
      let transportConfig: TransportConfig;

      if (integration.transportType === "SSE") {
        if (!integration.serverUrl) {
          throw new Error("Server URL is required for SSE transport");
        }

        // Build headers for authentication
        const headers: Record<string, string> = {};
        const authConfig = integration.authConfig as Record<string, string> | null;

        if (integration.authType === "API_KEY" && authConfig?.apiKey) {
          headers["X-API-Key"] = authConfig.apiKey;
        } else if (integration.authType === "BEARER" && authConfig?.apiKey) {
          headers["Authorization"] = `Bearer ${authConfig.apiKey}`;
        } else if (integration.authType === "CUSTOM_HEADER" && authConfig?.headerName && authConfig?.headerValue) {
          headers[authConfig.headerName] = authConfig.headerValue;
        }

        transportConfig = {
          type: "sse" as const,
          url: integration.serverUrl,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        };
      } else {
        // STDIO transport
        if (!integration.command) {
          throw new Error("Command is required for STDIO transport");
        }

        transportConfig = {
          type: "stdio" as const,
          command: integration.command,
          args: (integration.args as string[]) || [],
          env: (integration.env as Record<string, string>) || {},
        };
      }

      // Create and connect the MCP client
      const client = await createMCPClient({
        transport: transportConfig,
        autoInitialize: true,
        requestTimeout: 30000,
      });

      // Get server capabilities
      const state = client.state;
      const capabilities = state.capabilities;
      
      // Get tool count
      let toolCount = 0;
      if (client.hasToolsCapability()) {
        const tools = await client.listTools();
        toolCount = tools.length;
      }

      // Register with the tool registry
      const registry = getToolRegistry();
      await registry.addMCPClient(integration.name, client);

      // Update integration status
      const updated = await prisma.mCPIntegration.update({
        where: { id },
        data: {
          status: "CONNECTED",
          lastConnectedAt: new Date(),
          lastError: null,
          capabilities: capabilities as unknown as import("@prisma/client").Prisma.InputJsonValue,
          toolCount,
        },
      });

      await createAuditLog({
        orgId,
        action: "UPDATE",
        module: "MCP_INTEGRATION",
        recordId: id,
        actorType: "USER",
        actorId: userId,
        metadata: { action: "connected", toolCount },
      });

      return NextResponse.json({
        success: true,
        message: `Connected to ${integration.name}`,
        status: "CONNECTED",
        toolCount,
        capabilities: {
          tools: capabilities?.tools !== undefined,
          resources: capabilities?.resources !== undefined,
          prompts: capabilities?.prompts !== undefined,
        },
      });
    } catch (connectionError) {
      // Update status to ERROR
      const errorMessage = connectionError instanceof Error 
        ? connectionError.message 
        : "Unknown connection error";

      await prisma.mCPIntegration.update({
        where: { id },
        data: {
          status: "ERROR",
          lastError: errorMessage,
        },
      });

      console.error("[MCP Connect] Connection error:", connectionError);

      return NextResponse.json({
        success: false,
        error: `Failed to connect: ${errorMessage}`,
        status: "ERROR",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[MCP Connect] Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to MCP server" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp/integrations/[id]/connect
 * Disconnect from an MCP server
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.mCPIntegration.findFirst({
      where: { id, orgId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "MCP integration not found" },
        { status: 404 }
      );
    }

    // Remove from registry (this also disconnects the client)
    const registry = getToolRegistry();
    await registry.removeMCPClient(integration.name);

    // Update status
    await prisma.mCPIntegration.update({
      where: { id },
      data: {
        status: "DISCONNECTED",
        toolCount: 0,
      },
    });

    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "MCP_INTEGRATION",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      metadata: { action: "disconnected" },
    });

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${integration.name}`,
      status: "DISCONNECTED",
    });
  } catch (error) {
    console.error("[MCP Disconnect] Error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect from MCP server" },
      { status: 500 }
    );
  }
}
