/**
 * Credentials API
 * Save API key or basic auth credentials for an integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { saveCredentials, getAppByKey } from "@/lib/composio";

/**
 * POST /api/integrations/credentials
 * Save credentials for API key or basic auth integrations
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appKey, credentials } = body;

    if (!appKey) {
      return NextResponse.json(
        { error: "appKey is required" },
        { status: 400 }
      );
    }

    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json(
        { error: "credentials object is required" },
        { status: 400 }
      );
    }

    // Validate app exists and requires credentials
    const app = getAppByKey(appKey);
    if (!app) {
      return NextResponse.json(
        { error: "Unknown app" },
        { status: 400 }
      );
    }

    if (app.authMethod !== "api_key" && app.authMethod !== "basic_jwt") {
      return NextResponse.json(
        { error: "This app does not support credential-based authentication" },
        { status: 400 }
      );
    }

    await saveCredentials(authContext.orgId, appKey, credentials);

    return NextResponse.json({
      success: true,
      message: `Connected to ${app.name}`,
    });
  } catch (error) {
    console.error("Failed to save credentials:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save credentials" },
      { status: 500 }
    );
  }
}
