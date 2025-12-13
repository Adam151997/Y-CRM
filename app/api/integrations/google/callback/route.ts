/**
 * Google OAuth Callback Route
 * Handles the OAuth callback from Google
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  saveGoogleTokens,
} from "@/lib/integrations/google";

/**
 * GET /api/integrations/google/callback
 * Handles OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle errors from Google
  if (error) {
    console.error("[Google OAuth] Error from Google:", error);
    
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", `Google authorization failed: ${error}`);
    
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", "Invalid callback parameters");
    
    return NextResponse.redirect(errorUrl);
  }

  // Verify state cookie (CSRF protection)
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const orgId = request.cookies.get("google_oauth_org")?.value;

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
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;
    
    console.log("[Google OAuth] Exchanging code for tokens...");
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    
    // Get user info
    console.log("[Google OAuth] Getting user info...");
    const userInfo = await getGoogleUserInfo(tokens.access_token);
    
    // Save tokens to database
    console.log("[Google OAuth] Saving tokens for org:", orgId);
    await saveGoogleTokens(orgId, tokens, userInfo);
    
    // Redirect to success page
    const successUrl = new URL("/settings/integrations", request.url);
    successUrl.searchParams.set("success", `Connected to Google as ${userInfo.email}`);
    
    // Clear cookies
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_org");
    
    return response;
  } catch (error) {
    console.error("[Google OAuth] Callback error:", error);
    
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Failed to complete Google connection"
    );
    
    // Clear cookies
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete("google_oauth_state");
    response.cookies.delete("google_oauth_org");
    
    return response;
  }
}
