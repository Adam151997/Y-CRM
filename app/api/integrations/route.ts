/**
 * Integrations API
 * GET - List all integrations and their connection status
 * POST - Initiate connection to an app
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { getConnectionStatuses, initiateConnection } from "@/lib/composio";

/**
 * GET /api/integrations
 * List all available integrations and their connection status
 */
export async function GET() {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statuses = await getConnectionStatuses(authContext.orgId);

    return NextResponse.json({
      integrations: statuses,
    });
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
 * Initiate OAuth connection to an app
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

    // Determine callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const callbackUrl = `${baseUrl}/api/integrations/callback?provider=${appKey}`;

    const connectionRequest = await initiateConnection(
      authContext.orgId,
      appKey,
      callbackUrl
    );

    return NextResponse.json({
      success: true,
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.connectionId,
    });
  } catch (error) {
    console.error("Failed to initiate connection:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
