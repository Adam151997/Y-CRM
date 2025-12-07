import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import prisma from "./db";

export interface AuthContext {
  userId: string;
  orgId: string;
  orgSlug: string;
}

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
    }
  } catch (error) {
    // Handle race condition - another request might have created the org
    console.error("Error ensuring organization:", error);
  }
});

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
    data: { settings },
  });
}
