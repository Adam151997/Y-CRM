/**
 * Integrations API
 * GET - List all integrations and their connection status
 * POST - Initiate connection to an app (redirects to provider)
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { getGoogleConnectionInfo } from "@/lib/integrations/google";
import { getSlackConnectionInfo } from "@/lib/integrations/slack";
import { checkRoutePermission } from "@/lib/api-permissions";

/**
 * Available integrations with native OAuth
 */
const NATIVE_INTEGRATIONS = [
  {
    key: "google",
    name: "Google Workspace",
    description: "Gmail, Calendar, Drive, Docs, Sheets - One connection for all Google services",
    logo: "https://www.google.com/favicon.ico",
    category: "workspace",
    authMethod: "OAUTH2",
    services: ["Gmail", "Calendar", "Drive", "Docs", "Sheets", "Meet"],
  },
  {
    key: "slack",
    name: "Slack",
    description: "Send messages to channels and users",
    logo: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg",
    category: "communication",
    authMethod: "OAUTH2",
    services: ["Messaging"],
  },
];

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

    // Check settings view permission
    const permissionError = await checkRoutePermission(authContext.userId, authContext.orgId, "settings", "view");
    if (permissionError) return permissionError;

    // Get connection status for each integration
    const [googleInfo, slackInfo] = await Promise.all([
      getGoogleConnectionInfo(authContext.orgId),
      getSlackConnectionInfo(authContext.orgId),
    ]);

    const integrations = NATIVE_INTEGRATIONS.map((integration) => {
      if (integration.key === "google") {
        return {
          ...integration,
          isConnected: googleInfo?.connected || false,
          connectedAs: googleInfo?.email,
          connectedAt: googleInfo?.connectedAt,
        };
      }
      if (integration.key === "slack") {
        return {
          ...integration,
          isConnected: slackInfo?.connected || false,
          connectedAs: slackInfo?.teamName,
          connectedAt: slackInfo?.connectedAt,
        };
      }
      return { ...integration, isConnected: false };
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
 * Initiate OAuth connection - returns redirect URL for the provider
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings create permission (connecting integration = creating a connection)
    const permissionError = await checkRoutePermission(authContext.userId, authContext.orgId, "settings", "create");
    if (permissionError) return permissionError;

    const body = await request.json();
    const { appKey } = body;

    if (!appKey) {
      return NextResponse.json(
        { error: "appKey is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // Route to the appropriate OAuth authorize endpoint
    if (appKey === "google") {
      return NextResponse.json({
        success: true,
        redirectUrl: `${baseUrl}/api/integrations/google/authorize`,
      });
    }

    if (appKey === "slack") {
      return NextResponse.json({
        success: true,
        redirectUrl: `${baseUrl}/api/integrations/slack/authorize`,
      });
    }

    return NextResponse.json(
      { error: `Unknown integration: ${appKey}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Integrations API] Error:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
