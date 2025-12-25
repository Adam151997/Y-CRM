import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import {
  getRoutePermissionContext,
  filterToAllowedFields,
  validateEditFields,
} from "@/lib/api-permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateLeaveSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "EMERGENCY", "BEREAVEMENT", "OTHER"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  days: z.number().positive().optional(),
  reason: z.string().optional().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  rejectionReason: z.string().optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

// GET /api/leaves/[id] - Get a single leave
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leaves", "view");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to view leaves" }, { status: 403 });
    }

    const { id } = await params;

    const leave = await prisma.leave.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            department: true,
            position: true,
          },
        },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Apply field-level filtering
    const filteredLeave = filterToAllowedFields(
      leave as unknown as Record<string, unknown>,
      permCtx.allowedViewFields
    );

    return NextResponse.json(filteredLeave);
  } catch (error) {
    console.error("Error fetching leave:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave" },
      { status: 500 }
    );
  }
}

// PUT /api/leaves/[id] - Update a leave
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leaves", "edit");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to edit leaves" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get existing leave first
    const existingLeave = await prisma.leave.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Validate update data
    const validationResult = updateLeaveSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate field-level edit permissions
    const fieldValidation = validateEditFields(
      data as Record<string, unknown>,
      permCtx.allowedEditFields,
      ["customFields"]
    );
    if (!fieldValidation.valid) {
      return NextResponse.json(
        { error: `You don't have permission to edit these fields: ${fieldValidation.disallowedFields.join(", ")}` },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: Prisma.LeaveUpdateInput = {};

    if (data.type !== undefined) updateData.type = data.type;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.days !== undefined) updateData.days = new Prisma.Decimal(data.days);
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "APPROVED") {
        updateData.approvedById = auth.userId;
        updateData.approvedAt = new Date();
      } else if (data.status === "REJECTED") {
        updateData.approvedById = auth.userId;
        updateData.approvedAt = new Date();
        if (data.rejectionReason) {
          updateData.rejectionReason = data.rejectionReason;
        }
      }
    }
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    // Handle customFields merge
    if (data.customFields) {
      updateData.customFields = {
        ...(existingLeave.customFields as object),
        ...data.customFields,
      } as Prisma.InputJsonValue;
    }

    // Update leave
    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "LEAVE",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingLeave as unknown as Record<string, unknown>,
      newState: updatedLeave as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedLeave);
  } catch (error) {
    console.error("Error updating leave:", error);
    return NextResponse.json(
      { error: "Failed to update leave" },
      { status: 500 }
    );
  }
}

// DELETE /api/leaves/[id] - Delete a leave
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get permission context
    const permCtx = await getRoutePermissionContext(auth.userId, auth.orgId, "leaves", "delete");
    if (!permCtx.allowed) {
      return NextResponse.json({ error: "You don't have permission to delete leaves" }, { status: 403 });
    }

    const { id } = await params;

    // Get existing leave
    const existingLeave = await prisma.leave.findFirst({
      where: {
        id,
        orgId: auth.orgId,
      },
    });

    if (!existingLeave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Delete leave
    await prisma.leave.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "LEAVE",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingLeave as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting leave:", error);
    return NextResponse.json(
      { error: "Failed to delete leave" },
      { status: 500 }
    );
  }
}
