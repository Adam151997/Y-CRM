import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// All CRM modules that need permission configuration
const ALL_MODULES = [
  "leads",
  "contacts", 
  "accounts",
  "opportunities",
  "tasks",
  "documents",
  "dashboard",
  "pipeline",
  "reports",
  "tickets",
  "health",
  "playbooks",
  "campaigns",
  "segments",
  "forms",
  "settings",
];

const ALL_ACTIONS = ["view", "create", "edit", "delete"];

interface RoleDefinition {
  name: string;
  description: string;
  isSystem: boolean;
  isDefault: boolean;
  actions: string[];
}

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: "Admin",
    description: "Full access to all features",
    isSystem: true,
    isDefault: false,
    actions: ALL_ACTIONS,
  },
  {
    name: "Manager",
    description: "Full access to manage team and all records",
    isSystem: false,
    isDefault: false,
    actions: ALL_ACTIONS,
  },
  {
    name: "Rep",
    description: "Standard access for team members",
    isSystem: false,
    isDefault: true,
    actions: ["view", "create", "edit"],
  },
  {
    name: "Read Only",
    description: "View-only access to CRM data",
    isSystem: false,
    isDefault: false,
    actions: ["view"],
  },
];

async function seedRoles(orgId: string) {
  console.log(`\n📋 Seeding roles for organization: ${orgId}`);

  for (const roleDef of DEFAULT_ROLES) {
    const existingRole = await prisma.role.findUnique({
      where: { orgId_name: { orgId, name: roleDef.name } },
    });

    if (existingRole) {
      console.log(`  ⏭️  Role "${roleDef.name}" already exists, skipping...`);
      continue;
    }

    await prisma.role.create({
      data: {
        orgId,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        isDefault: roleDef.isDefault,
        permissions: {
          create: ALL_MODULES.map((module) => ({
            module,
            actions: roleDef.actions,
            fields: Prisma.JsonNull,
          })),
        },
      },
    });

    console.log(`  ✅ Created role: ${roleDef.name}`);
  }
}

async function assignAdminRole(orgId: string, clerkUserId: string) {
  console.log(`\n👤 Assigning Admin role to user: ${clerkUserId}`);

  const adminRole = await prisma.role.findUnique({
    where: { orgId_name: { orgId, name: "Admin" } },
  });

  if (!adminRole) {
    console.log("  ❌ Admin role not found. Run seedRoles first.");
    return;
  }

  const existingAssignment = await prisma.userRole.findUnique({
    where: { clerkUserId_orgId: { clerkUserId, orgId } },
  });

  if (existingAssignment) {
    // Update to Admin if different
    if (existingAssignment.roleId !== adminRole.id) {
      await prisma.userRole.update({
        where: { id: existingAssignment.id },
        data: { roleId: adminRole.id },
      });
      console.log(`  ✅ Updated user to Admin role`);
    } else {
      console.log(`  ⏭️  User already has Admin role`);
    }
  } else {
    await prisma.userRole.create({
      data: {
        clerkUserId,
        orgId,
        roleId: adminRole.id,
      },
    });
    console.log(`  ✅ Assigned Admin role to user`);
  }
}

async function main() {
  console.log("🌱 Starting Y CRM seed...\n");

  // ==========================================================================
  // CONFIGURATION - Update these values before running
  // ==========================================================================
  
  // Your Clerk Organization ID (find in Clerk Dashboard → Organizations)
  const ORG_ID = process.env.SEED_ORG_ID || "YOUR_ORG_ID_HERE";
  
  // Your Clerk User ID (find in Clerk Dashboard → Users)
  const ADMIN_USER_ID = process.env.SEED_ADMIN_USER_ID || "YOUR_USER_ID_HERE";

  // ==========================================================================

  if (ORG_ID === "YOUR_ORG_ID_HERE" || ADMIN_USER_ID === "YOUR_USER_ID_HERE") {
    console.log("⚠️  Please configure the seed script with your actual IDs:\n");
    console.log("  Option 1 - Environment variables:");
    console.log("    SEED_ORG_ID=org_xxx SEED_ADMIN_USER_ID=user_xxx npx prisma db seed\n");
    console.log("  Option 2 - Edit prisma/seed.ts directly:");
    console.log("    const ORG_ID = 'org_xxx';");
    console.log("    const ADMIN_USER_ID = 'user_xxx';\n");
    console.log("  Find your IDs in the Clerk Dashboard:");
    console.log("    - Organization ID: Organizations → Your Org → Settings");
    console.log("    - User ID: Users → Your User → User ID\n");
    process.exit(1);
  }

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
  });

  if (!org) {
    console.log(`❌ Organization with ID "${ORG_ID}" not found in database.`);
    console.log("   Make sure you've logged into the app at least once to create the organization.\n");
    process.exit(1);
  }

  console.log(`✅ Found organization: ${org.name} (${org.slug})`);

  // Seed roles
  await seedRoles(ORG_ID);

  // Assign admin role to the specified user
  await assignAdminRole(ORG_ID, ADMIN_USER_ID);

  console.log("\n🎉 Seed completed successfully!\n");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
