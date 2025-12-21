import { NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { checkRoutePermission } from "@/lib/api-permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/team
 * List all team members with their roles
 */
export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings view permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "view");
    if (permissionError) return permissionError;

    const clerk = await clerkClient();

    // Get organization members from Clerk
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: auth.orgId,
      limit: 100,
    });

    // Get user roles from our database
    const userRoles = await prisma.userRole.findMany({
      where: { orgId: auth.orgId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            isSystem: true,
          },
        },
      },
    });

    // Create a map of userId to role
    const roleMap = new Map(
      userRoles.map((ur) => [ur.clerkUserId, ur.role])
    );

    // Combine Clerk data with roles
    const members = memberships.data.map((membership) => {
      const user = membership.publicUserData;
      const userId = user?.userId || "";
      const role = roleMap.get(userId);

      return {
        id: membership.id,
        clerkUserId: userId,
        email: user?.identifier || "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        imageUrl: user?.imageUrl || "",
        role: role || null,
        orgRole: membership.role, // Clerk org role (admin, member)
        createdAt: membership.createdAt,
      };
    });

    // Get pending invitations
    const invitations = await clerk.organizations.getOrganizationInvitationList({
      organizationId: auth.orgId,
      status: ["pending"],
      limit: 50,
    });

    const pendingInvites = invitations.data.map((invite) => ({
      id: invite.id,
      email: invite.emailAddress,
      status: invite.status,
      role: invite.role,
      createdAt: invite.createdAt,
    }));

    return NextResponse.json({
      members,
      pendingInvites,
      currentUserId: auth.userId,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
