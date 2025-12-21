import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { checkRoutePermission } from "@/lib/api-permissions";

// GET /api/cs/renewals/[id] - Get a single renewal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check accounts permission (renewals are account-level data)
    const permissionError = await checkRoutePermission(userId, orgId, "accounts", "view");
    if (permissionError) return permissionError;

    const { id } = await params;

    const renewal = await prisma.renewal.findFirst({
      where: { id, orgId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            industry: true,
            website: true,
          },
        },
      },
    });

    if (!renewal) {
      return NextResponse.json(
        { error: "Renewal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ renewal });
  } catch (error) {
    console.error("Error fetching renewal:", error);
    return NextResponse.json(
      { error: "Failed to fetch renewal" },
      { status: 500 }
    );
  }
}

// Update schema
const updateRenewalSchema = z.object({
  contractName: z.string().optional(),
  contractValue: z.number().positive().optional(),
  currency: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional(),
  renewalValue: z.number().positive().optional().nullable(),
  probability: z.number().min(0).max(100).optional(),
  outcome: z.enum(["RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional().nullable(),
  churnReason: z.string().optional().nullable(),
  expansionAmount: z.number().optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lastContactAt: z.string().datetime().optional().nullable(),
  nextActionDate: z.string().datetime().optional().nullable(),
  nextAction: z.string().optional().nullable(),
});

// PUT /api/cs/renewals/[id] - Update a renewal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check accounts permission (renewals are account-level data)
    const permissionError = await checkRoutePermission(userId, orgId, "accounts", "edit");
    if (permissionError) return permissionError;

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateRenewalSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if renewal exists
    const existingRenewal = await prisma.renewal.findFirst({
      where: { id, orgId },
    });

    if (!existingRenewal) {
      return NextResponse.json(
        { error: "Renewal not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (data.contractName !== undefined) updateData.contractName = data.contractName;
    if (data.contractValue !== undefined) updateData.contractValue = data.contractValue;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.renewalValue !== undefined) updateData.renewalValue = data.renewalValue;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.outcome !== undefined) updateData.outcome = data.outcome;
    if (data.churnReason !== undefined) updateData.churnReason = data.churnReason;
    if (data.expansionAmount !== undefined) updateData.expansionAmount = data.expansionAmount;
    if (data.ownerUserId !== undefined) updateData.ownerUserId = data.ownerUserId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.lastContactAt !== undefined) {
      updateData.lastContactAt = data.lastContactAt ? new Date(data.lastContactAt) : null;
    }
    if (data.nextActionDate !== undefined) {
      updateData.nextActionDate = data.nextActionDate ? new Date(data.nextActionDate) : null;
    }
    if (data.nextAction !== undefined) updateData.nextAction = data.nextAction;

    // Update renewal
    const renewal = await prisma.renewal.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "UPDATE",
      module: "RENEWAL",
      recordId: renewal.id,
      actorType: "USER",
      actorId: userId,
      previousState: existingRenewal as unknown as Record<string, unknown>,
      newState: renewal as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ renewal });
  } catch (error) {
    console.error("Error updating renewal:", error);
    return NextResponse.json(
      { error: "Failed to update renewal" },
      { status: 500 }
    );
  }
}

// DELETE /api/cs/renewals/[id] - Delete a renewal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await getAuthContext();
    
    // Check accounts permission (renewals are account-level data)
    const permissionError = await checkRoutePermission(userId, orgId, "accounts", "delete");
    if (permissionError) return permissionError;

    const { id } = await params;

    // Check if renewal exists
    const existingRenewal = await prisma.renewal.findFirst({
      where: { id, orgId },
    });

    if (!existingRenewal) {
      return NextResponse.json(
        { error: "Renewal not found" },
        { status: 404 }
      );
    }

    // Delete renewal
    await prisma.renewal.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "RENEWAL",
      recordId: id,
      actorType: "USER",
      actorId: userId,
      previousState: existingRenewal as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting renewal:", error);
    return NextResponse.json(
      { error: "Failed to delete renewal" },
      { status: 500 }
    );
  }
}
