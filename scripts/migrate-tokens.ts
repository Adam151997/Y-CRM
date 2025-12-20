/**
 * Token Migration Utility
 * Migrates existing unencrypted tokens to encrypted storage
 * 
 * Run this script after deploying the encryption feature:
 * npx ts-node scripts/migrate-tokens.ts
 */

import prisma from "@/lib/db";
import { encrypt, isEncrypted } from "@/lib/encryption";

async function migrateIntegrationTokens() {
  console.log("Starting token migration...\n");

  // Get all integrations
  const integrations = await prisma.integration.findMany({
    select: {
      id: true,
      provider: true,
      orgId: true,
      accessToken: true,
      refreshToken: true,
      metadata: true,
    },
  });

  console.log(`Found ${integrations.length} integrations to check\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const integration of integrations) {
    try {
      const metadata = integration.metadata as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      let needsUpdate = false;

      // Check if tokens are in metadata (legacy format)
      if (metadata.access_token && !integration.accessToken) {
        const token = metadata.access_token as string;
        
        // Only encrypt if not already encrypted
        if (!isEncrypted(token)) {
          updates.accessToken = encrypt(token);
          needsUpdate = true;
          console.log(`  [${integration.provider}:${integration.id}] Migrating access_token from metadata`);
        }
      }

      if (metadata.refresh_token && !integration.refreshToken) {
        const token = metadata.refresh_token as string;
        
        if (!isEncrypted(token)) {
          updates.refreshToken = encrypt(token);
          needsUpdate = true;
          console.log(`  [${integration.provider}:${integration.id}] Migrating refresh_token from metadata`);
        }
      }

      if (metadata.expires_at && !integration.accessToken) {
        updates.tokenExpiresAt = new Date(metadata.expires_at as number);
        needsUpdate = true;
      }

      // Check if accessToken field exists but is unencrypted
      if (integration.accessToken && !isEncrypted(integration.accessToken)) {
        updates.accessToken = encrypt(integration.accessToken);
        needsUpdate = true;
        console.log(`  [${integration.provider}:${integration.id}] Encrypting existing accessToken`);
      }

      if (integration.refreshToken && !isEncrypted(integration.refreshToken)) {
        updates.refreshToken = encrypt(integration.refreshToken);
        needsUpdate = true;
        console.log(`  [${integration.provider}:${integration.id}] Encrypting existing refreshToken`);
      }

      if (needsUpdate) {
        // Remove tokens from metadata after migration
        const cleanMetadata = { ...metadata };
        delete cleanMetadata.access_token;
        delete cleanMetadata.refresh_token;
        delete cleanMetadata.expires_at;
        updates.metadata = cleanMetadata;

        await prisma.integration.update({
          where: { id: integration.id },
          data: updates,
        });

        migratedCount++;
        console.log(`  ✓ Migrated ${integration.provider} for org ${integration.orgId}`);
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error migrating ${integration.provider}:${integration.id}:`, error);
    }
  }

  console.log("\n--- Integration Token Migration Complete ---");
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped (already encrypted): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

async function migrateMCPIntegrationSecrets() {
  console.log("\nStarting MCP integration migration...\n");

  const mcpIntegrations = await prisma.mCPIntegration.findMany({
    select: {
      id: true,
      name: true,
      orgId: true,
      authConfig: true,
      env: true,
    },
  });

  console.log(`Found ${mcpIntegrations.length} MCP integrations to check\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const mcp of mcpIntegrations) {
    try {
      const updates: Record<string, unknown> = {};
      let needsUpdate = false;

      // Check if authConfig is a JSON object (legacy) vs encrypted string
      if (mcp.authConfig && typeof mcp.authConfig === "object") {
        const config = mcp.authConfig as Record<string, string>;
        if (Object.keys(config).length > 0 && config.apiKey !== undefined) {
          updates.authConfig = encrypt(JSON.stringify(config));
          needsUpdate = true;
          console.log(`  [${mcp.name}:${mcp.id}] Encrypting authConfig`);
        }
      }

      // Check if env is a JSON object (legacy) vs encrypted string
      if (mcp.env && typeof mcp.env === "object") {
        const env = mcp.env as Record<string, string>;
        if (Object.keys(env).length > 0) {
          updates.env = encrypt(JSON.stringify(env));
          needsUpdate = true;
          console.log(`  [${mcp.name}:${mcp.id}] Encrypting env`);
        }
      }

      if (needsUpdate) {
        await prisma.mCPIntegration.update({
          where: { id: mcp.id },
          data: updates,
        });

        migratedCount++;
        console.log(`  ✓ Migrated ${mcp.name} for org ${mcp.orgId}`);
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error migrating MCP ${mcp.name}:${mcp.id}:`, error);
    }
  }

  console.log("\n--- MCP Integration Migration Complete ---");
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped (already encrypted): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

async function main() {
  console.log("===========================================");
  console.log("  Token Encryption Migration");
  console.log("===========================================\n");

  // Check for encryption key
  if (!process.env.ENCRYPTION_KEY) {
    console.error("ERROR: ENCRYPTION_KEY environment variable is not set!");
    console.error("Generate one with: openssl rand -base64 32");
    process.exit(1);
  }

  try {
    await migrateIntegrationTokens();
    await migrateMCPIntegrationSecrets();

    console.log("\n===========================================");
    console.log("  Migration Complete!");
    console.log("===========================================\n");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for programmatic use
export { migrateIntegrationTokens, migrateMCPIntegrationSecrets };

// Run if executed directly
if (require.main === module) {
  main();
}
