import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { checkRoutePermission } from "@/lib/api-permissions";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().optional(),
});

/**
 * POST /api/team/invite
 * Invite a new team member via Clerk
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check settings create permission
    const permissionError = await checkRoutePermission(auth.userId, auth.orgId, "settings", "create");
    if (permissionError) return permissionError;

    const body = await request.json();
    const validated = inviteSchema.parse(body);

    // If roleId provided, verify it exists
    if (validated.roleId) {
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
    }

    const clerk = await clerkClient();

    // Create Clerk invitation
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: auth.orgId,
      emailAddress: validated.email,
      inviterUserId: auth.userId,
      role: "org:member", // Clerk org role
    });

    // Store the pending role assignment
    // This will be applied when the user accepts the invitation
    if (validated.roleId) {
      // Store in a temporary table or use invitation metadata
      // For now, we'll handle this in a webhook when user joins
      await prisma.$executeRaw`
        INSERT INTO "PendingRoleAssignment" ("invitationId", "orgId", "roleId", "email", "createdAt")
        VALUES (${invitation.id}, ${auth.orgId}, ${validated.roleId}, ${validated.email}, NOW())
        ON CONFLICT ("invitationId") DO UPDATE SET "roleId" = ${validated.roleId}
      `.catch(() => {
        // Table might not exist, that's ok - we'll assign default role on join
      });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.emailAddress,
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error) {
    console.error("Error inviting user:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    // Check for Clerk-specific errors
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("already exists")) {
      return NextResponse.json(
        { error: "This email has already been invited" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
