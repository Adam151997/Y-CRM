/**
 * Disconnect Integration API
 * POST - Disconnect an integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { disconnectGoogle } from "@/lib/integrations/google";
import { disconnectSlack } from "@/lib/integrations/slack";

/**
 * POST /api/integrations/disconnect
 * Disconnect an integration
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appKey } = body;

    if (!appKey) {
      return NextResponse.json(
        { error: "appKey is required" },
        { status: 400 }
      );
    }

    if (appKey === "google") {
      await disconnectGoogle(authContext.orgId);
      return NextResponse.json({
        success: true,
        message: "Google disconnected successfully",
      });
    }

    if (appKey === "slack") {
      await disconnectSlack(authContext.orgId);
      return NextResponse.json({
        success: true,
        message: "Slack disconnected successfully",
      });
    }

    return NextResponse.json(
      { error: `Unknown integration: ${appKey}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Disconnect] Error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
