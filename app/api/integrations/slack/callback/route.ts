/**
 * Slack OAuth Callback Route
 * Handles the OAuth callback from Slack
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { exchangeSlackCode, saveSlackTokens } from "@/lib/integrations/slack";

/**
 * GET /api/integrations/slack/callback
 * Handles OAuth callback from Slack
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle errors from Slack
  if (error) {
    console.error("[Slack OAuth] Error from Slack:", error);
    
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", `Slack authorization failed: ${error}`);
    
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", "Invalid callback parameters");
    
    return NextResponse.redirect(errorUrl);
  }

  // Verify state cookie (CSRF protection)
  const storedState = request.cookies.get("slack_oauth_state")?.value;
  const orgId = request.cookies.get("slack_oauth_org")?.value;

  if (!storedState || storedState !== state) {
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", "Invalid state parameter. Please try again.");
    
    return NextResponse.redirect(errorUrl);
  }

  if (!orgId) {
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", "Session expired. Please try again.");
    
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange code for tokens
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/integrations/slack/callback`;
    
    console.log("[Slack OAuth] Exchanging code for tokens...");
    const tokens = await exchangeSlackCode(code, redirectUri);
    
    // Save tokens to database
    console.log("[Slack OAuth] Saving tokens for org:", orgId);
    await saveSlackTokens(orgId, tokens);
    
    // Redirect to success page
    const successUrl = new URL("/settings/integrations", request.url);
    successUrl.searchParams.set("success", `Connected to Slack workspace: ${tokens.team.name}`);
    
    // Clear cookies
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete("slack_oauth_state");
    response.cookies.delete("slack_oauth_org");
    
    return response;
  } catch (error) {
    console.error("[Slack OAuth] Callback error:", error);
    
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Failed to complete Slack connection"
    );
    
    // Clear cookies
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete("slack_oauth_state");
    response.cookies.delete("slack_oauth_org");
    
    return response;
  }
}
