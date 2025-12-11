import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import prisma from "./db";
import { Prisma } from "@prisma/client";

export interface AuthContext {
  userId: string;
  orgId: string;
  orgSlug: string;
}

// All CRM modules for default permissions
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

/**
 * Get authenticated user context with organization
 * Redirects to sign-in if not authenticated
 * Creates organization record if it doesn't exist
 * 
 * Uses React cache() to dedupe within the same request
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const { userId, orgId, orgSlug } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // For now, use a default organization if none exists
  // In production, you'd want proper org onboarding
  const effectiveOrgId = orgId || `user_${userId}`;
  const effectiveOrgSlug = orgSlug || `user-${userId.slice(0, 8)}`;

  // Ensure organization exists in database
  await ensureOrganization(effectiveOrgId, effectiveOrgSlug, userId);

  return {
    userId,
    orgId: effectiveOrgId,
    orgSlug: effectiveOrgSlug,
  };
});

/**
 * Get auth context for API routes (doesn't redirect)
 * Uses React cache() to dedupe within the same request
 */
export const getApiAuthContext = cache(async (): Promise<AuthContext | null> => {
  const { userId, orgId, orgSlug } = await auth();

  if (!userId) {
    return null;
  }

  const effectiveOrgId = orgId || `user_${userId}`;
  const effectiveOrgSlug = orgSlug || `user-${userId.slice(0, 8)}`;

  await ensureOrganization(effectiveOrgId, effectiveOrgSlug, userId);

  return {
    userId,
    orgId: effectiveOrgId,
    orgSlug: effectiveOrgSlug,
  };
});

/**
 * Ensure organization record exists in database
 * Creates org, default roles, pipeline stages, and assigns admin role to creator
 * Cached to prevent duplicate checks
 */
const ensureOrganization = cache(async (
  orgId: string,
  orgSlug: string,
  userId: string
): Promise<void> => {
  try {
    const existing = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!existing) {
      // Get user info for org name
      const user = await currentUser();
      const orgName =
        user?.firstName && user?.lastName
          ? `${user.firstName}'s Organization`
          : "My Organization";

      await prisma.organization.create({
        data: {
          id: orgId,
          name: orgName,
          slug: orgSlug,
          plan: "FREE",
          settings: {},
        },
      });

      // Create default pipeline stages for the new organization
      await createDefaultPipelineStages(orgId);

      // Create default roles for the new organization
      await createDefaultRoles(orgId);

      // Assign Admin role to the org creator
      await assignAdminRole(orgId, userId);
    } else {
      // Organization exists - ensure user has a role
      await ensureUserHasRole(orgId, userId);
    }
  } catch (error) {
    // Handle race condition - another request might have created the org
    console.error("Error ensuring organization:", error);
  }
});

/**
 * Create default roles for a new organization
 */
async function createDefaultRoles(orgId: string): Promise<void> {
  const defaultRoles = [
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

  try {
    for (const roleDef of defaultRoles) {
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
    }
    console.log(`Created default roles for org: ${orgId}`);
  } catch (error) {
    console.error("Error creating default roles:", error);
  }
}

/**
 * Assign Admin role to the organization creator
 */
async function assignAdminRole(orgId: string, userId: string): Promise<void> {
  try {
    const adminRole = await prisma.role.findFirst({
      where: {
        orgId,
        name: "Admin",
      },
    });

    if (!adminRole) {
      console.error("Admin role not found for org:", orgId);
      return;
    }

    await prisma.userRole.create({
      data: {
        clerkUserId: userId,
        orgId,
        roleId: adminRole.id,
      },
    });

    console.log(`Assigned Admin role to user: ${userId}`);
  } catch (error) {
    console.error("Error assigning admin role:", error);
  }
}

/**
 * Ensure user has a role in the organization
 * Assigns default role if user doesn't have one
 */
async function ensureUserHasRole(orgId: string, userId: string): Promise<void> {
  try {
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        clerkUserId_orgId: {
          clerkUserId: userId,
          orgId,
        },
      },
    });

    if (existingUserRole) {
      return; // User already has a role
    }

    // Check if roles exist for this org
    const rolesExist = await prisma.role.count({
      where: { orgId },
    });

    if (rolesExist === 0) {
      // No roles exist - create them first
      await createDefaultRoles(orgId);
    }

    // Find default role or fallback to Rep
    const defaultRole = await prisma.role.findFirst({
      where: {
        orgId,
        OR: [
          { isDefault: true },
          { name: "Rep" },
        ],
      },
    });

    if (defaultRole) {
      await prisma.userRole.create({
        data: {
          clerkUserId: userId,
          orgId,
          roleId: defaultRole.id,
        },
      });
      console.log(`Assigned default role to user: ${userId}`);
    }
  } catch (error) {
    // Ignore duplicate key errors (race condition)
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
      console.error("Error ensuring user has role:", error);
    }
  }
}

/**
 * Create default pipeline stages for a new organization
 */
async function createDefaultPipelineStages(orgId: string): Promise<void> {
  // Lead pipeline stages
  const leadStages = [
    { name: "New", order: 0, color: "#6B7280" },
    { name: "Contacted", order: 1, color: "#3B82F6" },
    { name: "Qualified", order: 2, color: "#8B5CF6" },
    { name: "Converted", order: 3, color: "#10B981" },
    { name: "Lost", order: 4, color: "#EF4444" },
  ];

  // Opportunity pipeline stages
  const opportunityStages = [
    { name: "Prospecting", order: 0, color: "#6B7280", probability: 10 },
    { name: "Qualification", order: 1, color: "#3B82F6", probability: 20 },
    { name: "Proposal", order: 2, color: "#8B5CF6", probability: 50 },
    { name: "Negotiation", order: 3, color: "#F59E0B", probability: 75 },
    { name: "Closed Won", order: 4, color: "#10B981", probability: 100, isWon: true },
    { name: "Closed Lost", order: 5, color: "#EF4444", probability: 0, isLost: true },
  ];

  try {
    // Create lead stages
    await prisma.pipelineStage.createMany({
      data: leadStages.map((stage) => ({
        orgId,
        module: "LEAD",
        ...stage,
      })),
      skipDuplicates: true,
    });

    // Create opportunity stages
    await prisma.pipelineStage.createMany({
      data: opportunityStages.map((stage) => ({
        orgId,
        module: "OPPORTUNITY",
        ...stage,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error("Error creating default pipeline stages:", error);
  }
}

/**
 * Get current user's organization details
 * Cached to prevent duplicate queries
 */
export const getOrganization = cache(async (orgId: string) => {
  return prisma.organization.findUnique({
    where: { id: orgId },
  });
});

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  orgId: string,
  settings: Record<string, unknown>
) {
  return prisma.organization.update({
    where: { id: orgId },
    data: { settings: settings as Prisma.InputJsonValue },
  });
}
