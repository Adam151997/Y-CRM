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
  "invoices",
  "inventory",
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

// Sample inventory items for testing
const SAMPLE_INVENTORY = [
  {
    name: "Laptop Pro 15\"",
    sku: "TECH-LP15",
    description: "High-performance laptop with 15\" display, 16GB RAM, 512GB SSD",
    stockLevel: 25,
    reorderLevel: 5,
    unit: "pcs",
    unitPrice: 1299.99,
    costPrice: 899.99,
    category: "Electronics",
    tags: ["laptop", "computer", "tech"],
  },
  {
    name: "Wireless Mouse",
    sku: "TECH-WM01",
    description: "Ergonomic wireless mouse with long battery life",
    stockLevel: 150,
    reorderLevel: 30,
    unit: "pcs",
    unitPrice: 29.99,
    costPrice: 12.50,
    category: "Electronics",
    tags: ["mouse", "accessories", "wireless"],
  },
  {
    name: "USB-C Hub",
    sku: "TECH-HUB7",
    description: "7-in-1 USB-C hub with HDMI, USB-A, SD card reader",
    stockLevel: 75,
    reorderLevel: 15,
    unit: "pcs",
    unitPrice: 49.99,
    costPrice: 22.00,
    category: "Electronics",
    tags: ["hub", "usb-c", "accessories"],
  },
  {
    name: "Office Chair Premium",
    sku: "FURN-OC01",
    description: "Ergonomic office chair with lumbar support and adjustable armrests",
    stockLevel: 12,
    reorderLevel: 3,
    unit: "pcs",
    unitPrice: 349.99,
    costPrice: 175.00,
    category: "Furniture",
    tags: ["chair", "office", "ergonomic"],
  },
  {
    name: "Standing Desk 60\"",
    sku: "FURN-SD60",
    description: "Electric height-adjustable standing desk, 60\" wide",
    stockLevel: 8,
    reorderLevel: 2,
    unit: "pcs",
    unitPrice: 599.99,
    costPrice: 320.00,
    category: "Furniture",
    tags: ["desk", "standing", "adjustable"],
  },
  {
    name: "Notebook Pack (50)",
    sku: "SUPP-NB50",
    description: "Pack of 50 lined notebooks, A5 size",
    stockLevel: 200,
    reorderLevel: 50,
    unit: "pack",
    unitPrice: 89.99,
    costPrice: 35.00,
    category: "Office Supplies",
    tags: ["notebook", "stationery", "paper"],
  },
  {
    name: "Printer Paper (500 sheets)",
    sku: "SUPP-PP500",
    description: "Premium A4 printer paper, 500 sheets per ream",
    stockLevel: 3,
    reorderLevel: 20,
    unit: "box",
    unitPrice: 12.99,
    costPrice: 6.50,
    category: "Office Supplies",
    tags: ["paper", "printer", "a4"],
  },
  {
    name: "Consulting Hour",
    sku: "SVC-CON01",
    description: "One hour of professional consulting services",
    stockLevel: 999,
    reorderLevel: 0,
    unit: "hours",
    unitPrice: 150.00,
    costPrice: 50.00,
    category: "Services",
    tags: ["consulting", "service", "hourly"],
  },
  {
    name: "Training Session",
    sku: "SVC-TRN01",
    description: "Full-day training session (up to 10 participants)",
    stockLevel: 999,
    reorderLevel: 0,
    unit: "days",
    unitPrice: 2500.00,
    costPrice: 800.00,
    category: "Services",
    tags: ["training", "service", "education"],
  },
  {
    name: "Webcam HD",
    sku: "TECH-WC01",
    description: "1080p HD webcam with built-in microphone",
    stockLevel: 0,
    reorderLevel: 10,
    unit: "pcs",
    unitPrice: 79.99,
    costPrice: 35.00,
    category: "Electronics",
    tags: ["webcam", "camera", "video"],
  },
];

async function seedInventory(orgId: string, userId: string) {
  console.log(`\n📦 Seeding inventory items for organization: ${orgId}`);

  let created = 0;
  let skipped = 0;

  for (const item of SAMPLE_INVENTORY) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { orgId, sku: item.sku },
    });

    if (existing) {
      console.log(`  ⏭️  SKU "${item.sku}" already exists, skipping...`);
      skipped++;
      continue;
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        orgId,
        name: item.name,
        sku: item.sku,
        description: item.description,
        stockLevel: item.stockLevel,
        reorderLevel: item.reorderLevel,
        unit: item.unit,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        category: item.category,
        tags: item.tags,
        createdById: userId,
        createdByType: "SYSTEM",
        isActive: true,
      },
    });

    // Create initial stock movement if stock > 0
    if (item.stockLevel > 0) {
      await prisma.stockMovement.create({
        data: {
          orgId,
          inventoryItemId: newItem.id,
          type: "INITIAL",
          quantity: item.stockLevel,
          previousLevel: 0,
          newLevel: item.stockLevel,
          reason: "Initial inventory setup",
          createdById: userId,
          createdByType: "SYSTEM",
        },
      });
    }

    console.log(`  ✅ Created: ${item.name} (${item.sku}) - ${item.stockLevel} ${item.unit}`);
    created++;
  }

  console.log(`\n  📊 Summary: ${created} created, ${skipped} skipped`);
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

  // Seed inventory items
  await seedInventory(ORG_ID, ADMIN_USER_ID);

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
