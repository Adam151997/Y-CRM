import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { getRoutePermissionContext } from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const approveLeaveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

// POST /api/leaves/[id]/approve - Approve or reject a leave request
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context - need edit permission to approve/reject
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leaves", "edit");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to approve/reject leaves" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request
    const validationResult = approveLeaveSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { action, rejectionReason } = validationResult.data;

    // Get existing leave
    const existingLeave = await prisma.leave.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        employee: true,
      },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Check if leave is in PENDING status
    if (existingLeave.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot ${action} a leave that is already ${existingLeave.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update leave status
    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedById: auth.userId,
        approvedAt: new Date(),
        rejectionReason: action === "reject" ? rejectionReason : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    // If approved, update employee status if needed
    if (action === "approve") {
      const today = new Date();
      const startDate = new Date(updatedLeave.startDate);
      const endDate = new Date(updatedLeave.endDate);

      // If leave starts today or is ongoing, update employee status
      if (startDate <= today && endDate >= today) {
        await prisma.employee.update({
          where: { id: existingLeave.employeeId },
          data: { status: "ON_LEAVE" },
        });
      }
    }

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: action === "approve" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      module: "LEAVE",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingLeave as unknown as Record<string, unknown>,
      newState: updatedLeave as unknown as Record<string, unknown>,
      metadata: {
        action,
        rejectionReason: action === "reject" ? rejectionReason : null,
      },
    });

    return NextResponse.json({
      success: true,
      leave: updatedLeave,
      message: `Leave request ${action === "approve" ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Error approving/rejecting leave:", error);
    return NextResponse.json(
      { error: "Failed to process leave request" },
      { status: 500 }
    );
  }
}
