/**
 * Stock Movements API
 * GET - Get stock movement history for an inventory item
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import prisma from "@/lib/db";
import { stockMovementFiltersSchema } from "@/lib/validation/inventory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/inventory/[id]/movements
 * Get stock movement history for an inventory item
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

    // Verify item exists and belongs to org
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        orgId: authContext.orgId,
      },
      select: { id: true, name: true, sku: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = stockMovementFiltersSchema.parse({
      ...searchParams,
      inventoryItemId: id,
    });

    // Build where clause
    const where: Record<string, unknown> = {
      orgId: authContext.orgId,
      inventoryItemId: id,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.referenceType) {
      where.referenceType = filters.referenceType;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = filters.fromDate;
      }
      if (filters.toDate) {
        (where.createdAt as Record<string, unknown>).lte = filters.toDate;
      }
    }

    // Get total count
    const total = await prisma.stockMovement.count({ where });

    // Get movements with pagination
    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: filters.sortOrder },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
      },
      movements,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("[Stock Movements GET] Error:", error);

    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
