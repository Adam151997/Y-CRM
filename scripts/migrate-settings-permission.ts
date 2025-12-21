/**
 * Migration Script: Update Existing Roles with Settings Permission
 * 
 * This script updates existing roles in the database to add the "settings" module
 * permission where appropriate:
 * - Admin roles: Full access to settings (view, create, edit, delete)
 * - Other roles: No settings access (settings permission removed if exists)
 * 
 * Run with: npx ts-node scripts/migrate-settings-permission.ts
 */

import prisma from "../lib/db";
import { Prisma } from "@prisma/client";

async function migrateSettingsPermissions() {
  console.log("🔄 Starting settings permission migration...\n");

  try {
    // Get all roles with their permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
      },
    });

    console.log(`Found ${roles.length} roles to process\n`);

    let adminRolesUpdated = 0;
    let nonAdminRolesUpdated = 0;
    let permissionsCreated = 0;
    let permissionsDeleted = 0;

    for (const role of roles) {
      const isAdmin = role.isSystem || role.name.toLowerCase() === "admin";
      const existingSettingsPerm = role.permissions.find(p => p.module === "settings");

      if (isAdmin) {
        // Admin roles should have full settings access
        if (!existingSettingsPerm) {
          // Create settings permission for admin
          await prisma.permission.create({
            data: {
              roleId: role.id,
              module: "settings",
              actions: ["view", "create", "edit", "delete"],
              fields: Prisma.JsonNull,
              recordVisibility: "ALL",
            },
          });
          permissionsCreated++;
          console.log(`✅ Added settings permission to Admin role: ${role.name} (org: ${role.orgId})`);
        } else if (
          !existingSettingsPerm.actions.includes("view") ||
          !existingSettingsPerm.actions.includes("create") ||
          !existingSettingsPerm.actions.includes("edit") ||
          !existingSettingsPerm.actions.includes("delete")
        ) {
          // Update to full permissions
          await prisma.permission.update({
            where: { id: existingSettingsPerm.id },
            data: {
              actions: ["view", "create", "edit", "delete"],
            },
          });
          console.log(`✅ Updated settings permission for Admin role: ${role.name} (org: ${role.orgId})`);
        }
        adminRolesUpdated++;
      } else {
        // Non-admin roles should NOT have settings access
        if (existingSettingsPerm) {
          await prisma.permission.delete({
            where: { id: existingSettingsPerm.id },
          });
          permissionsDeleted++;
          console.log(`🗑️  Removed settings permission from role: ${role.name} (org: ${role.orgId})`);
        }
        nonAdminRolesUpdated++;
      }
    }

    console.log("\n========================================");
    console.log("📊 Migration Summary:");
    console.log(`   Admin roles processed: ${adminRolesUpdated}`);
    console.log(`   Non-admin roles processed: ${nonAdminRolesUpdated}`);
    console.log(`   Permissions created: ${permissionsCreated}`);
    console.log(`   Permissions removed: ${permissionsDeleted}`);
    console.log("========================================\n");

    console.log("✅ Settings permission migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSettingsPermissions()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
