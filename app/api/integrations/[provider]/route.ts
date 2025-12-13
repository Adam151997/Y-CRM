/**
 * Single Integration API - DEPRECATED
 * Use /api/integrations/disconnect for disconnecting integrations.
 * Connection status is now returned from /api/integrations
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { getGoogleConnectionInfo } from "@/lib/integrations/google";
import { getSlackConnectionInfo } from "@/lib/integrations/slack";
import { disconnectGoogle } from "@/lib/integrations/google";
import { disconnectSlack } from "@/lib/integrations/slack";

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
    
    let isConnected = false;
    
    if (provider === "google") {
      const info = await getGoogleConnectionInfo(authContext.orgId);
      isConnected = info?.connected || false;
    } else if (provider === "slack") {
      const info = await getSlackConnectionInfo(authContext.orgId);
      isConnected = info?.connected || false;
    }

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

    if (provider === "google") {
      await disconnectGoogle(authContext.orgId);
    } else if (provider === "slack") {
      await disconnectSlack(authContext.orgId);
    } else {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

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
