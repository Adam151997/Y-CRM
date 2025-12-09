import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

// GET /api/cs/health/[accountId] - Get health score for an account
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await getAuthContext();
    const { accountId } = await params;

    const health = await prisma.accountHealth.findFirst({
      where: { accountId, orgId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            industry: true,
            type: true,
          },
        },
      },
    });

    if (!health) {
      return NextResponse.json(
        { error: "Health score not found for this account" },
        { status: 404 }
      );
    }

    return NextResponse.json({ health });
  } catch (error) {
    console.error("Failed to fetch health score:", error);
    return NextResponse.json(
      { error: "Failed to fetch health score" },
      { status: 500 }
    );
  }
}

// DELETE /api/cs/health/[accountId] - Delete health score
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { accountId } = await params;

    const health = await prisma.accountHealth.findFirst({
      where: { accountId, orgId },
    });

    if (!health) {
      return NextResponse.json(
        { error: "Health score not found" },
        { status: 404 }
      );
    }

    await prisma.accountHealth.delete({
      where: { id: health.id },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "ACCOUNT_HEALTH",
      recordId: health.id,
      actorType: "USER",
      actorId: userId,
      previousState: health as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete health score:", error);
    return NextResponse.json(
      { error: "Failed to delete health score" },
      { status: 500 }
    );
  }
}
