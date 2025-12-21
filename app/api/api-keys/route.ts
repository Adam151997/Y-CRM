/**
 * API Keys Management Routes
 * GET /api/api-keys - List all API keys
 * POST /api/api-keys - Create a new API key
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  createAPIKey,
  listAPIKeys,
  API_KEY_SCOPES,
  DEFAULT_SCOPES,
} from "@/lib/api-keys";
import { checkRoutePermission } from "@/lib/api-permissions";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Validation schema for creating API key
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(z.enum([
    API_KEY_SCOPES.MCP_READ,
    API_KEY_SCOPES.MCP_WRITE,
    API_KEY_SCOPES.MCP_ADMIN,
  ])).optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * GET /api/api-keys
 * List all API keys for the organization
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "view");
    if (permissionError) return permissionError;

    const keys = await listAPIKeys(orgId);

    return NextResponse.json({
      keys,
      count: keys.length,
    });
  } catch (error) {
    console.error("[API Keys GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings create permission
    const permissionError = await checkRoutePermission(userId, orgId, "settings", "create");
    if (permissionError) return permissionError;

    const body = await request.json();
    const validation = createKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, scopes, expiresAt } = validation.data;

    const result = await createAPIKey({
      orgId,
      name,
      description,
      scopes: scopes || DEFAULT_SCOPES,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdById: userId,
    });

    return NextResponse.json({
      success: true,
      message: "API key created successfully",
      apiKey: result,
      // IMPORTANT: The full key is only returned once
      warning: "Save this key now. You won't be able to see it again.",
    }, { status: 201 });
  } catch (error) {
    console.error("[API Keys POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
