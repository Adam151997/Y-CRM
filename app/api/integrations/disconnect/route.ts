/**
 * Disconnect API
 * Disconnect an integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { disconnectApp, getAppByKey } from "@/lib/composio";

/**
 * POST /api/integrations/disconnect
 * Disconnect an app integration
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

    // Validate app exists
    const app = getAppByKey(appKey);
    if (!app) {
      return NextResponse.json(
        { error: "Unknown app" },
        { status: 400 }
      );
    }

    await disconnectApp(authContext.orgId, appKey);

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${app.name}`,
    });
  } catch (error) {
    console.error("Failed to disconnect:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 500 }
    );
  }
}
