/**
 * API Key Individual Operations
 * GET /api/api-keys/[id] - Get a specific API key
 * PUT /api/api-keys/[id] - Update an API key
 * DELETE /api/api-keys/[id] - Delete an API key
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  getAPIKey,
  updateAPIKey,
  deleteAPIKey,
  revokeAPIKey,
  API_KEY_SCOPES,
} from "@/lib/api-keys";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Validation schema for updating API key
const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  scopes: z.array(z.enum([
    API_KEY_SCOPES.MCP_READ,
    API_KEY_SCOPES.MCP_WRITE,
    API_KEY_SCOPES.MCP_ADMIN,
  ])).optional(),
});

/**
 * GET /api/api-keys/[id]
 * Get a specific API key
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = await getAPIKey(orgId, id);

    if (!key) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiKey: key });
  } catch (error) {
    console.error("[API Key GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/api-keys/[id]
 * Update an API key
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const result = await updateAPIKey(orgId, id, validation.data, userId);

    if (!result) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key updated",
      apiKey: result,
    });
  } catch (error) {
    console.error("[API Key PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys/[id]
 * Delete an API key permanently
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await deleteAPIKey(orgId, id, userId);

    if (!success) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key deleted",
    });
  } catch (error) {
    console.error("[API Key DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/api-keys/[id]
 * Revoke an API key (soft delete)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.action === "revoke") {
      const success = await revokeAPIKey(orgId, id, userId);

      if (!success) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "API key revoked",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API Key PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
