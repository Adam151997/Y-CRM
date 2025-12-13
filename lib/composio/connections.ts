/**
 * Composio Connections Manager
 * Handles user connections to external apps via OAuth
 */

import { getComposioClient, ConnectedAccount, ConnectionRequest } from "./client";
import { COMPOSIO_APPS, getAppByKey } from "./apps";
import prisma from "@/lib/db";

/**
 * Connection status for UI display
 */
export interface AppConnectionStatus {
  appKey: string;
  appName: string;
  logo: string;
  category: string;
  description: string;
  authMethod: string;
  isConnected: boolean;
  connectionId?: string;
  connectedAt?: Date;
  status?: string;
  error?: string;
}

/**
 * Get entity ID for a user/org
 * We use orgId as the entity ID for multi-tenant support
 */
export function getEntityId(orgId: string): string {
  return `ycrm_${orgId}`;
}

/**
 * Get connection status for all apps
 */
export async function getConnectionStatuses(
  orgId: string
): Promise<AppConnectionStatus[]> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  
  let connections: ConnectedAccount[] = [];
  try {
    connections = await client.listConnectedAccounts(entityId);
  } catch (error) {
    console.error("Failed to fetch Composio connections:", error);
  }

  // Also get local integration records
  const localIntegrations = await prisma.integration.findMany({
    where: { orgId },
  });

  const localMap = new Map(
    localIntegrations.map((i) => [i.provider.toLowerCase(), i])
  );
  
  return COMPOSIO_APPS.map((app) => {
    // Check Composio connections
    const composioConnection = connections.find(
      (conn) => conn.appName.toLowerCase() === app.key.toLowerCase()
    );

    // Check local database
    const localConnection = localMap.get(app.key.toLowerCase());
    
    const isConnected = 
      composioConnection?.status === "active" || 
      localConnection?.status === "ACTIVE";

    return {
      appKey: app.key,
      appName: app.name,
      logo: app.logo,
      category: app.category,
      description: app.description,
      authMethod: app.authMethod,
      isConnected,
      connectionId: composioConnection?.id || localConnection?.connectionId || undefined,
      connectedAt: composioConnection?.createdAt 
        ? new Date(composioConnection.createdAt) 
        : localConnection?.updatedAt || undefined,
      status: composioConnection?.status || localConnection?.status?.toLowerCase(),
      error: localConnection?.status === "ERROR" 
        ? (localConnection.metadata as Record<string, unknown>)?.error as string
        : undefined,
    };
  });
}

/**
 * Initiate OAuth connection to an app
 * Uses the integrationId (auth config ID) from the app config
 */
export async function initiateConnection(
  orgId: string,
  appKey: string,
  callbackUrl: string
): Promise<ConnectionRequest> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  const app = getAppByKey(appKey);

  if (!app) {
    throw new Error(`Unknown app: ${appKey}`);
  }

  if (!app.integrationId) {
    throw new Error(`No integrationId configured for app: ${appKey}`);
  }
  
  // Ensure entity exists
  await client.getOrCreateEntity(entityId);
  
  // Start OAuth flow with integrationId
  const request = await client.initiateConnection(
    app.key, 
    entityId, 
    callbackUrl,
    app.integrationId
  );
  
  // Store pending connection in database for tracking
  await prisma.integration.upsert({
    where: {
      orgId_provider: {
        orgId,
        provider: appKey,
      },
    },
    create: {
      orgId,
      provider: appKey,
      status: "PENDING",
      connectionId: request.connectionId,
    },
    update: {
      status: "PENDING",
      connectionId: request.connectionId,
      updatedAt: new Date(),
    },
  });
  
  return request;
}

/**
 * Handle OAuth callback and finalize connection
 */
export async function handleOAuthCallback(
  orgId: string,
  appKey: string,
  connectionId: string
): Promise<boolean> {
  const client = getComposioClient();
  
  try {
    // Check connection status
    const connection = await client.getConnectedAccount(connectionId);
    
    if (connection.status === "active") {
      // Update database record
      await prisma.integration.update({
        where: {
          orgId_provider: {
            orgId,
            provider: appKey,
          },
        },
        data: {
          status: "ACTIVE",
          connectionId: connection.id,
          metadata: {
            connectedAt: new Date().toISOString(),
            entityId: connection.entityId,
          },
          updatedAt: new Date(),
        },
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("OAuth callback error:", error);
    
    // Update status to error
    await prisma.integration.update({
      where: {
        orgId_provider: {
          orgId,
          provider: appKey,
        },
      },
      data: {
        status: "ERROR",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
        updatedAt: new Date(),
      },
    });
    
    return false;
  }
}

/**
 * Save API Key / Basic Auth credentials for an app
 */
export async function saveCredentials(
  orgId: string,
  appKey: string,
  credentials: Record<string, string>
): Promise<boolean> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  const app = getAppByKey(appKey);

  if (!app) {
    throw new Error(`Unknown app: ${appKey}`);
  }

  if (!app.integrationId) {
    throw new Error(`No integrationId configured for app: ${appKey}`);
  }

  try {
    // Ensure entity exists
    await client.getOrCreateEntity(entityId);

    // Create connection with credentials
    const response = await client.createConnectionWithCredentials(
      app.key,
      entityId,
      app.integrationId,
      credentials
    );

    // Update database
    await prisma.integration.upsert({
      where: {
        orgId_provider: {
          orgId,
          provider: appKey,
        },
      },
      create: {
        orgId,
        provider: appKey,
        status: "ACTIVE",
        connectionId: response.connectionId,
        metadata: {
          connectedAt: new Date().toISOString(),
        },
      },
      update: {
        status: "ACTIVE",
        connectionId: response.connectionId,
        metadata: {
          connectedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to save credentials:", error);
    
    await prisma.integration.upsert({
      where: {
        orgId_provider: {
          orgId,
          provider: appKey,
        },
      },
      create: {
        orgId,
        provider: appKey,
        status: "ERROR",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
      update: {
        status: "ERROR",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
        updatedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Disconnect an app
 */
export async function disconnectApp(
  orgId: string,
  appKey: string
): Promise<void> {
  const client = getComposioClient();
  
  // Get current connection from database
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: appKey,
      },
    },
  });
  
  if (integration?.connectionId) {
    try {
      await client.deleteConnection(integration.connectionId);
    } catch (error) {
      console.error("Failed to delete Composio connection:", error);
    }
  }
  
  // Update database
  await prisma.integration.update({
    where: {
      orgId_provider: {
        orgId,
        provider: appKey,
      },
    },
    data: {
      status: "DISCONNECTED",
      connectionId: null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Sync connection statuses from Composio to database
 */
export async function syncConnectionStatuses(orgId: string): Promise<void> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  
  const connections = await client.listConnectedAccounts(entityId);
  
  for (const conn of connections) {
    const app = COMPOSIO_APPS.find(
      (a) => a.key.toLowerCase() === conn.appName.toLowerCase()
    );
    
    if (app) {
      await prisma.integration.upsert({
        where: {
          orgId_provider: {
            orgId,
            provider: app.key,
          },
        },
        create: {
          orgId,
          provider: app.key,
          status: conn.status === "active" ? "ACTIVE" : "ERROR",
          connectionId: conn.id,
          metadata: {
            connectedAt: conn.createdAt,
          },
        },
        update: {
          status: conn.status === "active" ? "ACTIVE" : "ERROR",
          connectionId: conn.id,
          updatedAt: new Date(),
        },
      });
    }
  }
}

/**
 * Check if org has active connection to an app
 */
export async function hasConnection(
  orgId: string,
  appKey: string
): Promise<boolean> {
  const integration = await prisma.integration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: appKey,
      },
    },
  });
  
  return integration?.status === "ACTIVE";
}

/**
 * Get all active connections for an org
 */
export async function getActiveConnections(
  orgId: string
): Promise<string[]> {
  const integrations = await prisma.integration.findMany({
    where: {
      orgId,
      status: "ACTIVE",
    },
    select: {
      provider: true,
    },
  });
  
  return integrations.map((i) => i.provider);
}
