/**
 * Single Integration API
 * GET /api/integrations/[id] - Get integration details
 * PUT /api/integrations/[id] - Update integration
 * DELETE /api/integrations/[id] - Delete integration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRoutePermission } from "@/lib/api-permissions";
import { encrypt, safeDecrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/integrations/[id]
 * Get a specific integration with decrypted config (for editing)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionError = await checkRoutePermission(userId, orgId, "settings", "view");
    if (permissionError) return permissionError;

    const integration = await prisma.regularIntegration.findFirst({
      where: { id, orgId },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    // Decrypt sensitive config for editing
    const config = integration.config as Record<string, unknown>;
    if (config.authConfig && typeof config.authConfig === "string") {
      const decrypted = safeDecrypt(config.authConfig);
      if (decrypted) {
        config.authConfig = JSON.parse(decrypted);
      }
    }

    return NextResponse.json({
      integration: {
        ...integration,
        config,
      },
    });
  } catch (error) {
    console.error("[Integration GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 });
  }
}

/**
 * PUT /api/integrations/[id]
 * Update an integration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionError = await checkRoutePermission(userId, orgId, "settings", "edit");
    if (permissionError) return permissionError;

    const existing = await prisma.regularIntegration.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, url, headers, authType, authConfig, events, isEnabled } = body;

    // Check for duplicate name if changing
    if (name && name !== existing.name) {
      const duplicate = await prisma.regularIntegration.findFirst({
        where: { orgId, name, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An integration with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build updated config
    const config: Record<string, unknown> = {
      ...(existing.config as Record<string, unknown>),
    };

    if (url !== undefined) config.url = url;
    if (headers !== undefined) config.headers = headers;
    if (authType !== undefined) config.authType = authType;
    if (authConfig !== undefined) {
      config.authConfig = encrypt(JSON.stringify(authConfig));
    }

    const integration = await prisma.regularIntegration.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(events !== undefined && { events }),
        ...(isEnabled !== undefined && { isEnabled }),
        config,
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("[Integration PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/[id]
 * Delete an integration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionError = await checkRoutePermission(userId, orgId, "settings", "delete");
    if (permissionError) return permissionError;

    const existing = await prisma.regularIntegration.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    await prisma.regularIntegration.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Integration deleted" });
  } catch (error) {
    console.error("[Integration DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }
}
