/**
 * MCP Integration API - Individual Operations
 * GET, PUT, DELETE for specific integration
 * Auth config is encrypted at rest
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { encryptObject } from "@/lib/encryption";
import { checkRoutePermission } from "@/lib/api-permissions";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Validation schema for updating MCP integration
const updateMCPIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  transportType: z.enum(["SSE", "STDIO"]).optional(),
  serverUrl: z.string().url().optional().nullable(),
  command: z.string().optional().nullable(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional().nullable(),
  authType: z.enum(["NONE", "API_KEY", "BEARER", "CUSTOM_HEADER"]).optional(),
  authConfig: z.object({
    apiKey: z.string().optional(),
    headerName: z.string().optional(),
    headerValue: z.string().optional(),
  }).optional().nullable(),
  isEnabled: z.boolean().optional(),
  autoConnect: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/mcp/integrations/[id]
 * Get a specific MCP integration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "view");
    if (permissionError) return permissionError;

    const integration = await prisma.mCPIntegration.findFirst({
      where: { id, orgId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "MCP integration not found" },
        { status: 404 }
      );
    }

    // Don't expose sensitive auth config or env
    return NextResponse.json({
      integration: {
        id: integration.id,
        name: integration.name,
        description: integration.description,
        transportType: integration.transportType,
        serverUrl: integration.serverUrl,
        command: integration.command,
        args: integration.args,
        authType: integration.authType,
        // Indicate if secrets are configured without exposing them
        authConfig: integration.authConfig ? { configured: true } : null,
        env: integration.env ? { configured: true } : null,
        status: integration.status,
        lastConnectedAt: integration.lastConnectedAt,
        lastError: integration.lastError,
        capabilities: integration.capabilities,
        toolCount: integration.toolCount,
        isEnabled: integration.isEnabled,
        autoConnect: integration.autoConnect,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    console.error("[MCP Integration GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MCP integration" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mcp/integrations/[id]
 * Update an MCP integration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings edit permission
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "edit");
    if (permissionError) return permissionError;

    const existing = await prisma.mCPIntegration.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "MCP integration not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = updateMCPIntegrationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.mCPIntegration.findFirst({
        where: { orgId, name: data.name, id: { not: id } },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `MCP integration with name "${data.name}" already exists` },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Prisma.MCPIntegrationUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.transportType !== undefined) updateData.transportType = data.transportType;
    if (data.serverUrl !== undefined) updateData.serverUrl = data.serverUrl;
    if (data.command !== undefined) updateData.command = data.command;
    if (data.args !== undefined) updateData.args = data.args;
    if (data.authType !== undefined) updateData.authType = data.authType;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.autoConnect !== undefined) updateData.autoConnect = data.autoConnect;

    // Encrypt sensitive fields if provided
    if (data.authConfig !== undefined) {
      if (data.authConfig && Object.keys(data.authConfig).length > 0) {
        updateData.authConfig = encryptObject(data.authConfig as Record<string, unknown>);
      } else {
        updateData.authConfig = Prisma.JsonNull;
      }
    }

    if (data.env !== undefined) {
      if (data.env && Object.keys(data.env).length > 0) {
        updateData.env = encryptObject(data.env);
      } else {
        updateData.env = Prisma.JsonNull;
      }
    }

    // If disabling, set status to DISCONNECTED
    if (data.isEnabled === false) {
      updateData.status = "DISCONNECTED";
    }

    const integration = await prisma.mCPIntegration.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "MCP_INTEGRATION",
      recordId: integration.id,
      actorType: "USER",
      actorId: userId,
      previousState: {
        name: existing.name,
        transportType: existing.transportType,
        isEnabled: existing.isEnabled,
      },
      newState: {
        name: integration.name,
        transportType: integration.transportType,
        isEnabled: integration.isEnabled,
      },
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
      message: `Updated MCP integration: ${integration.name}`,
    });
  } catch (error) {
    console.error("[MCP Integration PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update MCP integration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp/integrations/[id]
 * Delete an MCP integration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings delete permission
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "delete");
    if (permissionError) return permissionError;

    const existing = await prisma.mCPIntegration.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "MCP integration not found" },
        { status: 404 }
      );
    }

    await prisma.mCPIntegration.delete({
      where: { id },
    });

    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "MCP_INTEGRATION",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      previousState: { name: existing.name, transportType: existing.transportType },
      metadata: { source: "api" },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted MCP integration: ${existing.name}`,
    });
  } catch (error) {
    console.error("[MCP Integration DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete MCP integration" },
      { status: 500 }
    );
  }
}
