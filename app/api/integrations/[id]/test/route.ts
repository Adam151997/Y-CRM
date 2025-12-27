/**
 * Test Integration Webhook
 * POST /api/integrations/[id]/test - Send a test webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRoutePermission } from "@/lib/api-permissions";
import { safeDecrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/integrations/[id]/test
 * Send a test webhook to verify the connection works
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionError = await checkRoutePermission(userId, orgId, "settings", "edit");
    if (permissionError) return permissionError;

    const integration = await prisma.regularIntegration.findFirst({
      where: { id, orgId },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    if (integration.type !== "webhook_outgoing") {
      return NextResponse.json(
        { error: "Only outgoing webhooks can be tested" },
        { status: 400 }
      );
    }

    const config = integration.config as Record<string, unknown>;
    const url = config.url as string;

    if (!url) {
      return NextResponse.json({ error: "No URL configured" }, { status: 400 });
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Source": "Y-CRM",
      "X-Webhook-Test": "true",
      ...(config.headers as Record<string, string> || {}),
    };

    // Add authentication
    const authType = config.authType as string;
    if (authType && authType !== "none") {
      let authConfig = config.authConfig;
      if (typeof authConfig === "string") {
        const decrypted = safeDecrypt(authConfig);
        if (decrypted) {
          authConfig = JSON.parse(decrypted);
        }
      }

      const auth = authConfig as Record<string, string> | null;
      if (auth) {
        switch (authType) {
          case "bearer":
            headers["Authorization"] = `Bearer ${auth.bearerToken}`;
            break;
          case "api_key":
            headers[auth.headerName || "X-API-Key"] = auth.apiKey || "";
            break;
          case "basic":
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
            headers["Authorization"] = `Basic ${credentials}`;
            break;
        }
      }
    }

    // Test payload
    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from Y-CRM",
        integrationId: integration.id,
        integrationName: integration.name,
      },
    };

    const startTime = Date.now();
    let responseStatus: number;
    let responseBody: string;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
      });

      responseStatus = response.status;
      responseBody = await response.text();
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Failed to connect: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
        duration: Date.now() - startTime,
      });
    }

    const duration = Date.now() - startTime;
    const success = responseStatus >= 200 && responseStatus < 300;

    return NextResponse.json({
      success,
      status: responseStatus,
      duration,
      response: responseBody.slice(0, 500), // Truncate long responses
      message: success
        ? "Webhook delivered successfully"
        : `Webhook returned status ${responseStatus}`,
    });
  } catch (error) {
    console.error("[Integration Test] Error:", error);
    return NextResponse.json(
      { error: "Failed to test integration" },
      { status: 500 }
    );
  }
}
