/**
 * Google OAuth Authorize Route
 * Initiates the OAuth flow for Google services
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/integrations/google";
import { randomBytes } from "crypto";

/**
 * GET /api/integrations/google/authorize
 * Redirects user to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Generate state token for CSRF protection
    const state = randomBytes(32).toString("hex");
    
    // Store state in cookie for verification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;
    
    // Generate authorization URL
    const authUrl = getGoogleAuthUrl(redirectUri, state, false);
    
    // Create response with redirect
    const response = NextResponse.redirect(authUrl);
    
    // Set state cookie (expires in 10 minutes)
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    
    // Store orgId for callback
    response.cookies.set("google_oauth_org", authContext.orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("[Google OAuth] Authorize error:", error);
    
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", "Failed to initiate Google connection");
    
    return NextResponse.redirect(errorUrl);
  }
}
