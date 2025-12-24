/**
 * Stock Adjustment API
 * POST - Manually adjust stock level (restock, correction, damage)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { stockAdjustmentSchema } from "@/lib/validation/inventory";
import { adjustStock } from "@/lib/inventory/transactions";
import { formatInventoryItem } from "@/lib/inventory/utils";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/inventory/[id]/adjust
 * Manually adjust stock level
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission (edit permission required for stock adjustments)
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "inventory",
      "edit"
    );

    // Verify item exists and belongs to org
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = stockAdjustmentSchema.parse(body);

    // Perform the adjustment
    const result = await adjustStock(
      authContext.orgId,
      id,
      data.quantity,
      data.type,
      data.reason,
      authContext.userId,
      "USER",
      data.notes
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get updated item
    const updatedItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "UPDATE",
      module: "INVENTORY",
      recordId: id,
      actorType: "USER",
      actorId: authContext.userId,
      previousState: { stockLevel: result.previousLevel },
      newState: { stockLevel: result.newLevel },
      metadata: {
        adjustmentType: data.type,
        quantity: data.quantity,
        reason: data.reason,
        notes: data.notes,
      },
    });

    return NextResponse.json({
      success: true,
      previousLevel: result.previousLevel,
      newLevel: result.newLevel,
      adjustment: data.quantity,
      type: data.type,
      item: updatedItem ? formatInventoryItem(updatedItem) : null,
    });
  } catch (error) {
    console.error("[Inventory Adjust] Error:", error);

    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
