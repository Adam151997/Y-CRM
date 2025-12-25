/**
 * Inventory Item API
 * GET - Get single inventory item
 * PATCH - Update inventory item
 * DELETE - Soft delete inventory item
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { updateInventoryItemSchema } from "@/lib/validation/inventory";
import { formatInventoryItem, isSkuUnique } from "@/lib/inventory/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/inventory/[id]
 * Get single inventory item by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "inventory",
      "view"
    );

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            invoiceItems: true,
            stockMovements: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...formatInventoryItem(item),
      recentMovements: item.stockMovements,
      stats: {
        totalInvoiceItems: item._count.invoiceItems,
        totalMovements: item._count.stockMovements,
      },
    });
  } catch (error) {
    console.error("[Inventory GET by ID] Error:", error);

    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/[id]
 * Update inventory item (not stock level - use /adjust endpoint for that)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "inventory",
      "edit"
    );

    // Get existing item
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateInventoryItemSchema.parse(body);

    // Check SKU uniqueness if being changed
    if (data.sku && data.sku !== existingItem.sku) {
      const skuUnique = await isSkuUnique(authContext.orgId, data.sku, id);
      if (!skuUnique) {
        return NextResponse.json(
          { error: `SKU "${data.sku}" already exists` },
          { status: 400 }
        );
      }
    }

    // Update item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.sku && { sku: data.sku }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
        ...(data.unit && { unit: data.unit }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.tags && { tags: data.tags }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "UPDATE",
      module: "INVENTORY",
      recordId: id,
      actorType: "USER",
      actorId: authContext.userId,
      previousState: existingItem,
      newState: updatedItem,
    });

    return NextResponse.json(formatInventoryItem(updatedItem));
  } catch (error) {
    console.error("[Inventory PATCH] Error:", error);

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

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An item with this SKU already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/[id]
 * Soft delete inventory item (set isActive = false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "inventory",
      "delete"
    );

    // Get existing item
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      include: {
        _count: {
          select: {
            invoiceItems: true,
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Warn if item has been used in invoices (but still allow soft delete)
    const hasInvoices = existingItem._count.invoiceItems > 0;

    // Soft delete (set isActive = false)
    await prisma.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "DELETE",
      module: "INVENTORY",
      recordId: id,
      actorType: "USER",
      actorId: authContext.userId,
      previousState: existingItem,
      metadata: {
        softDelete: true,
        hadInvoiceItems: hasInvoices,
        invoiceItemCount: existingItem._count.invoiceItems,
      },
    });

    return NextResponse.json({
      success: true,
      message: hasInvoices
        ? `Item deactivated. Note: This item appears in ${existingItem._count.invoiceItems} invoice(s).`
        : "Item deactivated successfully",
    });
  } catch (error) {
    console.error("[Inventory DELETE] Error:", error);

    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
