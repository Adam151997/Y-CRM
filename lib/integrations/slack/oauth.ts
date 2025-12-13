/**
 * Slack OAuth Client
 * Handles OAuth 2.0 flow for Slack
 */

import prisma from "@/lib/db";

// Slack OAuth configuration
const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

// Slack scopes for bot and user tokens
export const SLACK_SCOPES = [
  // Bot scopes
  "chat:write",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
  "users:read",
  "users:read.email",
  "team:read",
];

export interface SlackTokens {
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
  };
}

/**
 * Get Slack OAuth configuration
 */
function getSlackConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID and SLACK_CLIENT_SECRET are required");
  }
  
  return { clientId, clientSecret };
}

/**
 * Generate Slack OAuth authorization URL
 */
export function getSlackAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getSlackConfig();
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SLACK_SCOPES.join(","),
    state,
  });
  
  return `${SLACK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeSlackCode(
  code: string,
  redirectUri: string
): Promise<SlackTokens> {
  const { clientId, clientSecret } = getSlackConfig();
  
  const response = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    console.error("[Slack OAuth] Error:", data.error);
    throw new Error(`Slack OAuth error: ${data.error}`);
  }
  
  return {
    access_token: data.access_token,
    token_type: data.token_type,
    scope: data.scope,
    bot_user_id: data.bot_user_id,
    team: data.team,
    authed_user: data.authed_user,
  };
}

/**
 * Save Slack tokens to database
 */
export async function saveSlackTokens(
  orgId: string,
  tokens: SlackTokens
): Promise<void> {
  await prisma.integration.upsert({
    where: {
      orgId_provider: {
        orgId,
        provider: "slack",
      },
    },
    create: {
      orgId,
      provider: "slack",
      status: "ACTIVE",
      connectionId: tokens.team.id,
      metadata: {
        access_token: tokens.access_token,
        scope: tokens.scope,
        bot_user_id: tokens.bot_user_id,
        team_id: tokens.team.id,
        team_name: tokens.team.name,
        authed_user_id: tokens.authed_user.id,
        connectedAt: new Date().toISOString(),
      },
    },
    update: {
      status: "ACTIVE",
      connectionId: tokens.team.id,
      metadata: {
        access_token: tokens.access_token,
        scope: tokens.scope,
        bot_user_id: tokens.bot_user_id,
        team_id: tokens.team.id,
        team_name: tokens.team.name,
        authed_user_id: tokens.authed_user.id,
        connectedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  });
}

/**
 * Get Slack access token for org
 */
export async function getSlackAccessToken(orgId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "slack",
      },
    },
  });
  
  if (!integration || integration.status !== "ACTIVE") {
    return null;
  }
  
  const metadata = integration.metadata as Record<string, unknown>;
  return metadata.access_token as string;
}

/**
 * Check if org has active Slack connection
 */
export async function hasSlackConnection(orgId: string): Promise<boolean> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "slack",
      },
    },
  });
  
  return integration?.status === "ACTIVE";
}

/**
 * Get Slack connection info for org
 */
export async function getSlackConnectionInfo(orgId: string): Promise<{
  connected: boolean;
  teamName?: string;
  teamId?: string;
  connectedAt?: string;
} | null> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "slack",
      },
    },
  });
  
  if (!integration) {
    return { connected: false };
  }
  
  const metadata = integration.metadata as Record<string, unknown>;
  
  return {
    connected: integration.status === "ACTIVE",
    teamName: metadata.team_name as string,
    teamId: metadata.team_id as string,
    connectedAt: metadata.connectedAt as string,
  };
}

/**
 * Disconnect Slack integration
 */
export async function disconnectSlack(orgId: string): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: "slack",
      },
    },
  });
  
  if (integration) {
    const metadata = integration.metadata as Record<string, unknown>;
    const accessToken = metadata.access_token as string;
    
    // Revoke token with Slack
    if (accessToken) {
      try {
        await fetch("https://slack.com/api/auth.revoke", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.error("[Slack] Failed to revoke token:", error);
      }
    }
    
    // Update database
    await prisma.integration.update({
      where: {
        orgId_provider: {
          orgId,
          provider: "slack",
        },
      },
      data: {
        status: "DISCONNECTED",
        metadata: {},
        updatedAt: new Date(),
      },
    });
  }
}
