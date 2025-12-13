/**
 * Google Disconnect Route
 * Disconnects Google integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { disconnectGoogle } from "@/lib/integrations/google";

/**
 * POST /api/integrations/google/disconnect
 * Disconnects Google integration for the organization
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnectGoogle(authContext.orgId);

    return NextResponse.json({
      success: true,
      message: "Google disconnected successfully",
    });
  } catch (error) {
    console.error("[Google] Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Google" },
      { status: 500 }
    );
  }
}
