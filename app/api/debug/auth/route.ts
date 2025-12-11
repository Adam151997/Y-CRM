import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/auth
 * Debug endpoint to check auth context and permissions lookup
 */
export async function GET() {
  try {
    // Get raw Clerk auth
    const clerkAuth = await auth();
    
    // Calculate effective IDs (same logic as lib/auth.ts)
    const effectiveOrgId = clerkAuth.orgId || `user_${clerkAuth.userId}`;
    
    // Check UserRole in database
    const userRole = clerkAuth.userId ? await prisma.userRole.findUnique({
      where: {
        clerkUserId_orgId: {
          clerkUserId: clerkAuth.userId,
          orgId: effectiveOrgId,
        },
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    }) : null;

    // Also check what UserRoles exist for this user
    const allUserRoles = clerkAuth.userId ? await prisma.userRole.findMany({
      where: {
        clerkUserId: clerkAuth.userId,
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    }) : [];

    // Check what roles exist for the effective org
    const orgRoles = await prisma.role.findMany({
      where: {
        orgId: effectiveOrgId,
      },
      select: {
        id: true,
        name: true,
        orgId: true,
      },
    });

    return NextResponse.json({
      clerkAuth: {
        userId: clerkAuth.userId,
        orgId: clerkAuth.orgId,
        orgSlug: clerkAuth.orgSlug,
        orgRole: clerkAuth.orgRole,
      },
      computed: {
        effectiveOrgId,
        lookupKey: {
          clerkUserId: clerkAuth.userId,
          orgId: effectiveOrgId,
        },
      },
      database: {
        userRoleFound: !!userRole,
        userRole: userRole ? {
          id: userRole.id,
          clerkUserId: userRole.clerkUserId,
          orgId: userRole.orgId,
          roleName: userRole.role.name,
          permissionCount: userRole.role.permissions.length,
        } : null,
        allUserRolesForUser: allUserRoles.map(ur => ({
          orgId: ur.orgId,
          roleName: ur.role.name,
        })),
        rolesInEffectiveOrg: orgRoles,
      },
    });
  } catch (error) {
    console.error("Debug auth error:", error);
    return NextResponse.json(
      { error: "Debug failed", details: String(error) },
      { status: 500 }
    );
  }
}
