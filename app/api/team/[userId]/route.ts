import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/api-permissions";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  roleId: z.string(),
});

/**
 * PUT /api/team/[userId]
 * Update a team member's role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can change user roles
    const adminError = await requireAdminAccess(auth.userId, auth.orgId);
    if (adminError) return adminError;

    const { userId } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    // Verify role exists
    const role = await prisma.role.findFirst({
      where: {
        id: validated.roleId,
        orgId: auth.orgId,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Upsert user role
    const userRole = await prisma.userRole.upsert({
      where: {
        clerkUserId_orgId: {
          clerkUserId: userId,
          orgId: auth.orgId,
        },
      },
      update: {
        roleId: validated.roleId,
      },
      create: {
        clerkUserId: userId,
        orgId: auth.orgId,
        roleId: validated.roleId,
      },
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

    return NextResponse.json({
      success: true,
      userRole: {
        clerkUserId: userRole.clerkUserId,
        role: userRole.role,
      },
    });
  } catch (error) {
    console.error("Error updating user role:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/[userId]
 * Remove a team member from the organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can remove team members
    const adminError = await requireAdminAccess(auth.userId, auth.orgId);
    if (adminError) return adminError;

    const { userId } = await params;

    // Can't remove yourself
    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();

    // Get the membership to find the membership ID
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: auth.orgId,
    });

    const membership = memberships.data.find(
      (m) => m.publicUserData?.userId === userId
    );

    if (!membership) {
      return NextResponse.json(
        { error: "User not found in organization" },
        { status: 404 }
      );
    }

    // Remove from Clerk organization
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: auth.orgId,
      userId: userId,
    });

    // Remove user role from our database
    await prisma.userRole.deleteMany({
      where: {
        clerkUserId: userId,
        orgId: auth.orgId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing user:", error);
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 }
    );
  }
}
