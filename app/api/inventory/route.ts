/**
 * Inventory API
 * GET - List inventory items with filters
 * POST - Create new inventory item
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  createInventoryItemSchema,
  inventoryFiltersSchema,
} from "@/lib/validation/inventory";
import {
  formatInventoryItem,
  isSkuUnique,
  generateSKU,
} from "@/lib/inventory/utils";
import { createInitialStockMovement } from "@/lib/inventory/transactions";

/**
 * GET /api/inventory
 * List inventory items with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "inventory",
      "view"
    );

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = inventoryFiltersSchema.parse(searchParams);

    // Build where clause
    const where: Prisma.InventoryItemWhereInput = {
      orgId: authContext.orgId,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Low stock filter - items at or below reorder level
    if (filters.lowStock) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { stockLevel: { gt: 0 } },
        {
          stockLevel: {
            lte: prisma.inventoryItem.fields.reorderLevel,
          },
        },
      ];
    }

    // Out of stock filter
    if (filters.outOfStock) {
      where.stockLevel = 0;
    }

    // Get total count
    const total = await prisma.inventoryItem.count({ where });

    // Get inventory items with pagination
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: {
        [filters.sortBy]: filters.sortOrder,
      },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    // Format items with stock status
    const formattedItems = items.map(formatInventoryItem);

    return NextResponse.json({
      items: formattedItems,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("[Inventory GET] Error:", error);

    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory
 * Create a new inventory item
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getApiAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    await requirePermission(
      authContext.userId,
      authContext.orgId,
      "inventory",
      "create"
    );

    const body = await request.json();
    const data = createInventoryItemSchema.parse(body);

    // Check SKU uniqueness
    const skuUnique = await isSkuUnique(authContext.orgId, data.sku);
    if (!skuUnique) {
      return NextResponse.json(
        { error: `SKU "${data.sku}" already exists` },
        { status: 400 }
      );
    }

    // Create inventory item with initial stock movement in a transaction
    const item = await prisma.$transaction(async (tx) => {
      // Create the inventory item
      const newItem = await tx.inventoryItem.create({
        data: {
          orgId: authContext.orgId,
          name: data.name,
          sku: data.sku,
          description: data.description,
          stockLevel: data.stockLevel,
          reorderLevel: data.reorderLevel,
          unit: data.unit,
          unitPrice: data.unitPrice,
          costPrice: data.costPrice,
          category: data.category,
          tags: data.tags || [],
          isActive: data.isActive,
          createdById: authContext.userId,
          createdByType: "USER",
        },
      });

      // Create initial stock movement if stock > 0
      await createInitialStockMovement(
        tx,
        authContext.orgId,
        newItem.id,
        data.stockLevel,
        authContext.userId,
        "USER"
      );

      return newItem;
    });

    // Create audit log
    await createAuditLog({
      orgId: authContext.orgId,
      action: "CREATE",
      module: "INVENTORY",
      recordId: item.id,
      actorType: "USER",
      actorId: authContext.userId,
      newState: item,
    });

    return NextResponse.json(formatInventoryItem(item), { status: 201 });
  } catch (error) {
    console.error("[Inventory POST] Error:", error);

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

    // Handle unique constraint violation
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
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
