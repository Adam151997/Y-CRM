/**
 * Single Integration API
 * DELETE - Disconnect an integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { disconnectApp, hasConnection } from "@/lib/composio";

interface RouteParams {
  params: Promise<{ provider: string }>;
}

/**
 * GET /api/integrations/[provider]
 * Get status of a specific integration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await params;
    const isConnected = await hasConnection(authContext.orgId, provider);

    return NextResponse.json({
      provider,
      isConnected,
    });
  } catch (error) {
    console.error("Failed to get integration status:", error);
    return NextResponse.json(
      { error: "Failed to get integration status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/[provider]
 * Disconnect an integration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await params;

    await disconnectApp(authContext.orgId, provider);

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${provider}`,
    });
  } catch (error) {
    console.error("Failed to disconnect integration:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
