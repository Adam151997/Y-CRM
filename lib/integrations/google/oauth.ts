/**
 * Google OAuth Client
 * Handles OAuth 2.0 flow for all Google services
 * Tokens are encrypted at rest
 */

import prisma from "@/lib/db";
import { encrypt, decrypt, safeDecrypt } from "@/lib/encryption";

// Google OAuth configuration
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// All scopes we need for Google services
export const GOOGLE_SCOPES = [
  // Gmail
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  // Calendar
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  // Drive
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  // Docs & Sheets
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  // User info
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// Optional: Google Ads scope (requires additional verification)
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Get Google OAuth configuration
 */
function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }
  
  return { clientId, clientSecret };
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(
  redirectUri: string,
  state: string,
  includeAds: boolean = false
): string {
  const { clientId } = getGoogleConfig();
  
  const scopes = includeAds 
    ? [...GOOGLE_SCOPES, GOOGLE_ADS_SCOPE]
    : GOOGLE_SCOPES;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",  // Get refresh token
    prompt: "consent",       // Force consent to get refresh token
    state,
  });
  
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getGoogleConfig();
  
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token exchange error:", error);
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type,
    scope: data.scope,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getGoogleConfig();
  
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token refresh error:", error);
    throw new Error(`Failed to refresh token: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep existing refresh token
    expires_at: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type,
    scope: data.scope,
  };
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to get user info");
  }
  
  return response.json();
}

/**
 * Save Google tokens to database (encrypted)
 */
export async function saveGoogleTokens(
  orgId: string,
  tokens: GoogleTokens,
  userInfo: GoogleUserInfo
): Promise<void> {
  // Encrypt sensitive tokens
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

  await prisma.integration.upsert({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
    create: {
      orgId,
      provider: "google",
      status: "ACTIVE",
      connectionId: userInfo.id,
      // Store encrypted tokens in dedicated fields
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: new Date(tokens.expires_at),
      // Non-sensitive metadata
      metadata: {
        scope: tokens.scope,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        connectedAt: new Date().toISOString(),
      },
    },
    update: {
      status: "ACTIVE",
      connectionId: userInfo.id,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: new Date(tokens.expires_at),
      metadata: {
        scope: tokens.scope,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        connectedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  });
}

/**
 * Get valid access token for org (auto-refreshes if expired)
 */
export async function getValidAccessToken(orgId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
  });
  
  if (!integration || integration.status !== "ACTIVE") {
    return null;
  }

  // Get tokens - support both new encrypted fields and legacy metadata storage
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let expiresAt: number;

  if (integration.accessToken) {
    // New format: tokens in dedicated encrypted fields
    accessToken = safeDecrypt(integration.accessToken);
    refreshToken = integration.refreshToken ? safeDecrypt(integration.refreshToken) : null;
    expiresAt = integration.tokenExpiresAt?.getTime() || 0;
  } else {
    // Legacy format: tokens in metadata (may be unencrypted)
    const metadata = integration.metadata as Record<string, unknown>;
    accessToken = safeDecrypt(metadata.access_token as string);
    refreshToken = metadata.refresh_token ? safeDecrypt(metadata.refresh_token as string) : null;
    expiresAt = metadata.expires_at as number;
  }

  if (!accessToken) {
    return null;
  }
  
  // Check if token is expired (with 5 min buffer)
  if (Date.now() > expiresAt - 300000) {
    if (!refreshToken) {
      console.error("[Google] No refresh token available");
      return null;
    }
    
    try {
      console.log("[Google] Refreshing access token...");
      const newTokens = await refreshAccessToken(refreshToken);
      
      // Update database with new encrypted tokens
      const encryptedAccessToken = encrypt(newTokens.access_token);
      
      await prisma.integration.update({
        where: {
          orgId_provider: {
            orgId,
            provider: "google",
          },
        },
        data: {
          accessToken: encryptedAccessToken,
          tokenExpiresAt: new Date(newTokens.expires_at),
          updatedAt: new Date(),
        },
      });
      
      return newTokens.access_token;
    } catch (error) {
      console.error("[Google] Failed to refresh token:", error);
      
      // Mark integration as error
      await prisma.integration.update({
        where: {
          orgId_provider: {
            orgId,
            provider: "google",
          },
        },
        data: {
          status: "ERROR",
          updatedAt: new Date(),
        },
      });
      
      return null;
    }
  }
  
  return accessToken;
}

/**
 * Check if org has active Google connection
 */
export async function hasGoogleConnection(orgId: string): Promise<boolean> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
  });
  
  return integration?.status === "ACTIVE";
}

/**
 * Get Google connection info for org
 */
export async function getGoogleConnectionInfo(orgId: string): Promise<{
  connected: boolean;
  email?: string;
  name?: string;
  picture?: string;
  connectedAt?: string;
} | null> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
  });
  
  if (!integration) {
    return { connected: false };
  }
  
  const metadata = integration.metadata as Record<string, unknown>;
  
  return {
    connected: integration.status === "ACTIVE",
    email: metadata.email as string,
    name: metadata.name as string,
    picture: metadata.picture as string,
    connectedAt: metadata.connectedAt as string,
  };
}

/**
 * Disconnect Google integration
 */
export async function disconnectGoogle(orgId: string): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
  });
  
  if (integration) {
    // Get access token for revocation
    let accessToken: string | null = null;
    
    if (integration.accessToken) {
      accessToken = safeDecrypt(integration.accessToken);
    } else {
      const metadata = integration.metadata as Record<string, unknown>;
      accessToken = metadata.access_token ? safeDecrypt(metadata.access_token as string) : null;
    }
    
    // Revoke token with Google
    if (accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: "POST",
        });
      } catch (error) {
        console.error("[Google] Failed to revoke token:", error);
      }
    }
    
    // Clear sensitive data from database
    await prisma.integration.update({
      where: {
        orgId_provider: {
          orgId,
          provider: "google",
        },
      },
      data: {
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        metadata: {},
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Rotate encryption - re-encrypt tokens with new key
 * Call this when rotating ENCRYPTION_KEY
 */
export async function rotateGoogleTokenEncryption(
  orgId: string,
  oldKey: string
): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
  });

  if (!integration || !integration.accessToken) {
    return;
  }

  // Temporarily use old key to decrypt
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKey;

  const decryptedAccess = decrypt(integration.accessToken);
  const decryptedRefresh = integration.refreshToken ? decrypt(integration.refreshToken) : null;

  // Restore new key and re-encrypt
  process.env.ENCRYPTION_KEY = originalKey;

  await prisma.integration.update({
    where: {
      orgId_provider: {
        orgId,
        provider: "google",
      },
    },
    data: {
      accessToken: encrypt(decryptedAccess),
      refreshToken: decryptedRefresh ? encrypt(decryptedRefresh) : null,
      updatedAt: new Date(),
    },
  });
}
