/**
 * MCP Integrations API
 * Manage external MCP server connections
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

// Validation schema for creating MCP integration
const createMCPIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  transportType: z.enum(["SSE", "STDIO"]).default("SSE"),
  serverUrl: z.string().url().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  authType: z.enum(["NONE", "API_KEY", "BEARER", "CUSTOM_HEADER"]).optional(),
  authConfig: z.object({
    apiKey: z.string().optional(),
    headerName: z.string().optional(),
    headerValue: z.string().optional(),
  }).optional(),
  isEnabled: z.boolean().default(true),
  autoConnect: z.boolean().default(true),
}).refine((data) => {
  // SSE requires serverUrl
  if (data.transportType === "SSE" && !data.serverUrl) {
    return false;
  }
  // STDIO requires command
  if (data.transportType === "STDIO" && !data.command) {
    return false;
  }
  return true;
}, {
  message: "SSE transport requires serverUrl, STDIO transport requires command",
});

/**
 * GET /api/mcp/integrations
 * List all MCP integrations for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await prisma.mCPIntegration.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        transportType: true,
        serverUrl: true,
        command: true,
        args: true,
        authType: true,
        status: true,
        lastConnectedAt: true,
        lastError: true,
        capabilities: true,
        toolCount: true,
        isEnabled: true,
        autoConnect: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      integrations,
      count: integrations.length,
    });
  } catch (error) {
    console.error("[MCP Integrations GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MCP integrations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/integrations
 * Create a new MCP integration
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createMCPIntegrationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate name
    const existing = await prisma.mCPIntegration.findFirst({
      where: { orgId, name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: `MCP integration with name "${data.name}" already exists` },
        { status: 409 }
      );
    }

    // Create the integration
    const integration = await prisma.mCPIntegration.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        transportType: data.transportType,
        serverUrl: data.serverUrl,
        command: data.command,
        args: data.args || [],
        env: data.env || {},
        authType: data.authType || "NONE",
        authConfig: data.authConfig || {},
        isEnabled: data.isEnabled,
        autoConnect: data.autoConnect,
        status: "DISCONNECTED",
        createdById: userId,
      },
    });

    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "MCP_INTEGRATION",
      recordId: integration.id,
      actorType: "USER",
      actorId: userId,
      newState: { ...integration, authConfig: "[REDACTED]" } as unknown as Record<string, unknown>,
      metadata: { source: "api" },
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        description: integration.description,
        transportType: integration.transportType,
        serverUrl: integration.serverUrl,
        command: integration.command,
        status: integration.status,
        isEnabled: integration.isEnabled,
      },
      message: `Created MCP integration: ${integration.name}`,
    }, { status: 201 });
  } catch (error) {
    console.error("[MCP Integrations POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create MCP integration" },
      { status: 500 }
    );
  }
}
