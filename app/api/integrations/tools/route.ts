/**
 * Composio Tools API
 * GET - List available tools for connected apps
 * POST - Execute a tool
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import {
  getEntityId,
  getConnectedAppTools,
  executeComposioTool,
  getActiveConnections,
} from "@/lib/composio";

/**
 * GET /api/integrations/tools
 * List available tools for the user's connected apps
 */
export async function GET() {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entityId = getEntityId(authContext.orgId);
    
    // Get tools only for connected apps
    const tools = await getConnectedAppTools(entityId);
    const connectedApps = await getActiveConnections(authContext.orgId);

    return NextResponse.json({
      tools,
      connectedApps,
      totalTools: tools.length,
    });
  } catch (error) {
    console.error("Failed to fetch tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/tools
 * Execute a Composio tool
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { toolName, arguments: args } = body;

    if (!toolName) {
      return NextResponse.json(
        { error: "toolName is required" },
        { status: 400 }
      );
    }

    const entityId = getEntityId(authContext.orgId);
    
    const result = await executeComposioTool(
      toolName,
      args || {},
      entityId
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to execute tool:", error);
    return NextResponse.json(
      { error: "Failed to execute tool" },
      { status: 500 }
    );
  }
}
