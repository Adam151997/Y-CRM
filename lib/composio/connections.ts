/**
 * Composio Connections Manager
 * Handles user connections to external apps via OAuth
 */

import { getComposioClient, ConnectedAccount, ConnectionRequest } from "./client";
import prisma from "@/lib/db";
import { FEATURED_APPS } from "./tools";

/**
 * Connection status for UI display
 */
export interface AppConnectionStatus {
  appKey: string;
  appName: string;
  icon: string;
  category: string;
  isConnected: boolean;
  connectionId?: string;
  connectedAt?: Date;
  status?: string;
}

/**
 * Get entity ID for a user/org
 * We use orgId as the entity ID for multi-tenant support
 */
export function getEntityId(orgId: string): string {
  return `ycrm_${orgId}`;
}

/**
 * Get connection status for all featured apps
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
    console.error("Failed to fetch connections:", error);
  }
  
  return FEATURED_APPS.map((app) => {
    const connection = connections.find(
      (conn) => conn.appName.toLowerCase() === app.key.toLowerCase()
    );
    
    return {
      appKey: app.key,
      appName: app.name,
      icon: app.icon,
      category: app.category,
      isConnected: connection?.status === "active",
      connectionId: connection?.id,
      connectedAt: connection?.createdAt ? new Date(connection.createdAt) : undefined,
      status: connection?.status,
    };
  });
}

/**
 * Initiate OAuth connection to an app
 */
export async function initiateConnection(
  orgId: string,
  appKey: string,
  callbackUrl: string
): Promise<ConnectionRequest> {
  const client = getComposioClient();
  const entityId = getEntityId(orgId);
  
  // Ensure entity exists
  await client.getOrCreateEntity(entityId);
  
  // Start OAuth flow
  const request = await client.initiateConnection(appKey, entityId, callbackUrl);
  
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
      metadata: {},
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
    await prisma.integration.upsert({
      where: {
        orgId_provider: {
          orgId,
          provider: conn.appName.toLowerCase(),
        },
      },
      create: {
        orgId,
        provider: conn.appName.toLowerCase(),
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
