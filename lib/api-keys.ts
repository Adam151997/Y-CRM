/**
 * API Key Management
 * Generate, validate, and manage API keys for MCP server access
 */

import prisma from "@/lib/db";
import { generateApiKey, verifyApiKey, hashValue } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";

// Available scopes for API keys
export const API_KEY_SCOPES = {
  MCP_READ: "mcp:read",     // Read data via MCP tools
  MCP_WRITE: "mcp:write",   // Create/update data via MCP tools
  MCP_ADMIN: "mcp:admin",   // Full access including destructive operations
} as const;

export type APIKeyScope = typeof API_KEY_SCOPES[keyof typeof API_KEY_SCOPES];

// Default scopes for new keys
export const DEFAULT_SCOPES: APIKeyScope[] = [
  API_KEY_SCOPES.MCP_READ,
  API_KEY_SCOPES.MCP_WRITE,
];

export interface CreateAPIKeyParams {
  orgId: string;
  name: string;
  description?: string;
  scopes?: APIKeyScope[];
  expiresAt?: Date;
  createdById: string;
}

export interface APIKeyResult {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
  // Only returned on creation
  key?: string;
}

export interface ValidateKeyResult {
  valid: boolean;
  keyId?: string;
  orgId?: string;
  scopes?: string[];
  error?: string;
}

/**
 * Create a new API key
 * Returns the full key ONLY on creation (it's never stored)
 */
export async function createAPIKey(params: CreateAPIKeyParams): Promise<APIKeyResult & { key: string }> {
  const { key, prefix, hash } = generateApiKey();
  
  const apiKey = await prisma.aPIKey.create({
    data: {
      orgId: params.orgId,
      name: params.name,
      description: params.description,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: params.scopes || DEFAULT_SCOPES,
      expiresAt: params.expiresAt,
      createdById: params.createdById,
    },
  });

  await createAuditLog({
    orgId: params.orgId,
    action: "CREATE",
    module: "API_KEY",
    recordId: apiKey.id,
    actorType: "USER",
    actorId: params.createdById,
    newState: {
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt?.toISOString(),
    },
    metadata: { source: "api_key_management" },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    description: apiKey.description,
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    key, // Only time the full key is returned
  };
}

/**
 * Validate an API key
 * Returns org context if valid
 */
export async function validateAPIKey(key: string): Promise<ValidateKeyResult> {
  // Basic format check
  if (!key || !key.startsWith("ycrm_")) {
    return { valid: false, error: "Invalid key format" };
  }

  const keyHash = hashValue(key);
  const keyPrefix = key.substring(0, 12);

  // Find key by hash
  const apiKey = await prisma.aPIKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid or inactive API key" };
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update usage stats (fire and forget)
  prisma.aPIKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  }).catch((error) => {
    console.error("[APIKey] Failed to update usage stats:", error);
  });

  return {
    valid: true,
    keyId: apiKey.id,
    orgId: apiKey.orgId,
    scopes: apiKey.scopes,
  };
}

/**
 * List API keys for an organization
 * Never returns the actual key
 */
export async function listAPIKeys(orgId: string): Promise<APIKeyResult[]> {
  const keys = await prisma.aPIKey.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
      isActive: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    description: k.description,
    keyPrefix: k.keyPrefix,
    scopes: k.scopes,
    expiresAt: k.expiresAt,
    createdAt: k.createdAt,
    isActive: k.isActive,
    lastUsedAt: k.lastUsedAt,
    usageCount: k.usageCount,
    revokedAt: k.revokedAt,
  }));
}

/**
 * Get a single API key by ID
 */
export async function getAPIKey(orgId: string, keyId: string): Promise<APIKeyResult | null> {
  const key = await prisma.aPIKey.findFirst({
    where: { id: keyId, orgId },
    select: {
      id: true,
      name: true,
      description: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
      isActive: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  if (!key) return null;

  return {
    id: key.id,
    name: key.name,
    description: key.description,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
  };
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(
  orgId: string,
  keyId: string,
  revokedById: string
): Promise<boolean> {
  const key = await prisma.aPIKey.findFirst({
    where: { id: keyId, orgId },
  });

  if (!key) return false;

  await prisma.aPIKey.update({
    where: { id: keyId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedById,
    },
  });

  await createAuditLog({
    orgId,
    action: "UPDATE",
    module: "API_KEY",
    recordId: keyId,
    actorType: "USER",
    actorId: revokedById,
    previousState: { isActive: true },
    newState: { isActive: false, revokedAt: new Date().toISOString() },
    metadata: { action: "revoked" },
  });

  return true;
}

/**
 * Delete an API key permanently
 */
export async function deleteAPIKey(
  orgId: string,
  keyId: string,
  deletedById: string
): Promise<boolean> {
  const key = await prisma.aPIKey.findFirst({
    where: { id: keyId, orgId },
  });

  if (!key) return false;

  await prisma.aPIKey.delete({
    where: { id: keyId },
  });

  await createAuditLog({
    orgId,
    action: "DELETE",
    module: "API_KEY",
    recordId: keyId,
    actorType: "USER",
    actorId: deletedById,
    previousState: { name: key.name, keyPrefix: key.keyPrefix },
    metadata: { action: "deleted" },
  });

  return true;
}

/**
 * Update API key (name, description, scopes only)
 */
export async function updateAPIKey(
  orgId: string,
  keyId: string,
  updates: {
    name?: string;
    description?: string;
    scopes?: APIKeyScope[];
  },
  updatedById: string
): Promise<APIKeyResult | null> {
  const existing = await prisma.aPIKey.findFirst({
    where: { id: keyId, orgId },
  });

  if (!existing) return null;

  const key = await prisma.aPIKey.update({
    where: { id: keyId },
    data: {
      name: updates.name,
      description: updates.description,
      scopes: updates.scopes,
    },
  });

  await createAuditLog({
    orgId,
    action: "UPDATE",
    module: "API_KEY",
    recordId: keyId,
    actorType: "USER",
    actorId: updatedById,
    previousState: {
      name: existing.name,
      description: existing.description,
      scopes: existing.scopes,
    },
    newState: {
      name: key.name,
      description: key.description,
      scopes: key.scopes,
    },
  });

  return {
    id: key.id,
    name: key.name,
    description: key.description,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
  };
}

/**
 * Check if a key has a specific scope
 */
export function hasScope(scopes: string[], requiredScope: APIKeyScope): boolean {
  // Admin scope grants all permissions
  if (scopes.includes(API_KEY_SCOPES.MCP_ADMIN)) {
    return true;
  }
  
  return scopes.includes(requiredScope);
}

/**
 * Check if a key has write permissions
 */
export function canWrite(scopes: string[]): boolean {
  return hasScope(scopes, API_KEY_SCOPES.MCP_WRITE);
}

/**
 * Check if a key has read permissions
 */
export function canRead(scopes: string[]): boolean {
  return hasScope(scopes, API_KEY_SCOPES.MCP_READ);
}
