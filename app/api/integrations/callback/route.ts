/**
 * OAuth Callback Handler
 * Handles the redirect from Composio after OAuth
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { handleOAuthCallback } from "@/lib/composio";

/**
 * GET /api/integrations/callback
 * Handle OAuth callback from Composio
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider");
  const connectionId = searchParams.get("connectionId") || searchParams.get("connection_id");
  const status = searchParams.get("status");
  const error = searchParams.get("error");

  // Redirect base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const settingsUrl = `${baseUrl}/settings/integrations`;

  // Handle error from OAuth
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(error)}`
    );
  }

  if (!provider) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Missing provider")}`
    );
  }

  try {
    const authContext = await getApiAuthContext();
    
    if (!authContext) {
      // User not logged in - redirect to sign in
      return NextResponse.redirect(
        `${baseUrl}/sign-in?redirect_url=${encodeURIComponent(request.url)}`
      );
    }

    // If we have a connection ID, verify it
    if (connectionId) {
      const success = await handleOAuthCallback(
        authContext.orgId,
        provider,
        connectionId
      );

      if (success) {
        return NextResponse.redirect(
          `${settingsUrl}?success=${encodeURIComponent(`Connected to ${provider}`)}`
        );
      } else {
        return NextResponse.redirect(
          `${settingsUrl}?error=${encodeURIComponent(`Failed to verify ${provider} connection`)}`
        );
      }
    }

    // No connection ID - might be pending or direct redirect
    if (status === "active" || status === "success") {
      return NextResponse.redirect(
        `${settingsUrl}?success=${encodeURIComponent(`Connected to ${provider}`)}`
      );
    }

    return NextResponse.redirect(
      `${settingsUrl}?info=${encodeURIComponent(`Connection to ${provider} is pending`)}`
    );
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Connection failed")}`
    );
  }
}
