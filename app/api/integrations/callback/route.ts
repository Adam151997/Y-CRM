/**
 * Legacy OAuth Callback Handler
 * This route is deprecated - use /api/integrations/google/callback or /api/integrations/slack/callback
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/settings/integrations?error=This+callback+endpoint+is+deprecated`);
}
