/**
 * MCP Integration Tools API
 * GET: List tools available from this MCP server
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getToolRegistry } from "@/lib/mcp/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/mcp/integrations/[id]/tools
 * List tools from a connected MCP server
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    if (integration.status !== "CONNECTED") {
      return NextResponse.json(
        { error: "MCP server is not connected", status: integration.status },
        { status: 400 }
      );
    }

    // Get tools from the registry
    const registry = getToolRegistry();
    const allTools = registry.getAllTools();

    // Filter tools that belong to this integration (prefixed with integration name)
    const integrationTools = allTools.filter(
      (tool) => tool.source === "external" && tool.serverName === integration.name
    );

    return NextResponse.json({
      integrationId: integration.id,
      integrationName: integration.name,
      count: integrationTools.length,
      tools: integrationTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
  } catch (error) {
    console.error("[MCP Tools GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MCP tools" },
      { status: 500 }
    );
  }
}
