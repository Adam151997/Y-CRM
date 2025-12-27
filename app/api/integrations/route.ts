/**
 * Integrations API
 * GET - List all integrations (regular webhooks/API connections)
 * POST - Create a new integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { checkRoutePermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { Prisma } from "@prisma/client";

/**
 * GET /api/integrations
 * List all integrations for the organization
 */
export async function GET() {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(
      authContext.userId,
      authContext.orgId,
      "settings",
      "view"
    );
    if (permissionError) return permissionError;

    const integrations = await prisma.regularIntegration.findMany({
      where: { orgId: authContext.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        isEnabled: true,
        events: true,
        lastTriggeredAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Create a new integration
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings create permission
    const permissionError = await checkRoutePermission(
      authContext.userId,
      authContext.orgId,
      "settings",
      "create"
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const { name, description, type, url, headers, authType, authConfig, events } = body;

    // Validation
    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    if (type === "webhook_outgoing" && !url) {
      return NextResponse.json(
        { error: "url is required for outgoing webhooks" },
        { status: 400 }
      );
    }

    if (type === "webhook_outgoing" && (!events || events.length === 0)) {
      return NextResponse.json(
        { error: "At least one event must be selected for outgoing webhooks" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.regularIntegration.findFirst({
      where: { orgId: authContext.orgId, name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An integration with this name already exists" },
        { status: 400 }
      );
    }

    // Encrypt sensitive config
    const config: Record<string, unknown> = {
      url,
      headers: headers || {},
      authType: authType || "none",
    };

    if (authConfig) {
      config.authConfig = encrypt(JSON.stringify(authConfig));
    }

    const integration = await prisma.regularIntegration.create({
      data: {
        orgId: authContext.orgId,
        name,
        description: description || null,
        type,
        config: config as Prisma.InputJsonValue,
        events: events || [],
        isEnabled: true,
        createdById: authContext.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        isEnabled: true,
        events: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    console.error("[Integrations API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create integration" },
      { status: 500 }
    );
  }
}
