import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { StockCheckResult, InventoryItemWithStatus } from "@/lib/validation/inventory";

/**
 * Generate the next SKU for an organization
 * Format: SKU-XXXX (e.g., SKU-0001, SKU-0002)
 */
export async function generateSKU(orgId: string, prefix: string = "SKU"): Promise<string> {
  // Get the highest SKU number for this org with the given prefix
  const lastItem = await prisma.inventoryItem.findFirst({
    where: {
      orgId,
      sku: { startsWith: `${prefix}-` },
    },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  let nextNumber = 1;

  if (lastItem?.sku) {
    const match = lastItem.sku.match(new RegExp(`${prefix}-(\\d+)`));
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Check stock availability for multiple items
 * Returns detailed information about each item's availability
 */
export async function checkStockAvailability(
  orgId: string,
  items: Array<{ inventoryItemId: string; quantity: number }>
): Promise<StockCheckResult> {
  // Fetch all inventory items in one query
  const inventoryItemIds = items.map((item) => item.inventoryItemId);

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: {
      id: { in: inventoryItemIds },
      orgId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      stockLevel: true,
    },
  });

  // Create a map for quick lookup
  const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));

  // Check each requested item
  const results: StockCheckResult["items"] = [];
  const insufficientItems: StockCheckResult["insufficientItems"] = [];

  for (const requestedItem of items) {
    const inventoryItem = itemMap.get(requestedItem.inventoryItemId);

    if (!inventoryItem) {
      // Item not found or not active
      results.push({
        inventoryItemId: requestedItem.inventoryItemId,
        name: "Unknown",
        sku: "Unknown",
        requestedQuantity: requestedItem.quantity,
        availableStock: 0,
        sufficient: false,
        shortfall: requestedItem.quantity,
      });
      insufficientItems.push({
        inventoryItemId: requestedItem.inventoryItemId,
        name: "Unknown",
        sku: "Unknown",
        shortfall: requestedItem.quantity,
      });
    } else {
      const sufficient = inventoryItem.stockLevel >= requestedItem.quantity;
      const shortfall = sufficient ? undefined : requestedItem.quantity - inventoryItem.stockLevel;

      results.push({
        inventoryItemId: inventoryItem.id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        requestedQuantity: requestedItem.quantity,
        availableStock: inventoryItem.stockLevel,
        sufficient,
        shortfall,
      });

      if (!sufficient) {
        insufficientItems.push({
          inventoryItemId: inventoryItem.id,
          name: inventoryItem.name,
          sku: inventoryItem.sku,
          shortfall: shortfall!,
        });
      }
    }
  }

  return {
    valid: insufficientItems.length === 0,
    items: results,
    insufficientItems,
  };
}

/**
 * Get stock status for an inventory item
 */
export function getStockStatus(
  stockLevel: number,
  reorderLevel: number
): "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" {
  if (stockLevel <= 0) {
    return "OUT_OF_STOCK";
  }
  if (stockLevel <= reorderLevel) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

/**
 * Calculate profit margin
 */
export function calculateMargin(
  unitPrice: number | Decimal,
  costPrice: number | Decimal | null
): number | null {
  if (!costPrice) return null;

  const price = toNumber(unitPrice);
  const cost = toNumber(costPrice);

  if (price <= 0) return null;

  const margin = ((price - cost) / price) * 100;
  return Math.round(margin * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert Decimal or number to number
 */
function toNumber(value: number | Decimal): number {
  if (typeof value === "number") {
    return value;
  }
  return value.toNumber();
}

/**
 * Get stock status display info
 */
export function getStockStatusInfo(status: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK"): {
  label: string;
  color: string;
  bgColor: string;
} {
  const statusMap = {
    OUT_OF_STOCK: {
      label: "Out of Stock",
      color: "text-red-700",
      bgColor: "bg-red-100",
    },
    LOW_STOCK: {
      label: "Low Stock",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
    },
    IN_STOCK: {
      label: "In Stock",
      color: "text-green-700",
      bgColor: "bg-green-100",
    },
  };

  return statusMap[status];
}

/**
 * Format inventory item with status and computed fields
 */
export function formatInventoryItem(
  item: {
    id: string;
    name: string;
    sku: string;
    description: string | null;
    stockLevel: number;
    reorderLevel: number;
    unit: string;
    unitPrice: Decimal;
    costPrice: Decimal | null;
    category: string | null;
    tags: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
): InventoryItemWithStatus {
  return {
    ...item,
    unitPrice: toNumber(item.unitPrice),
    costPrice: item.costPrice ? toNumber(item.costPrice) : null,
    stockStatus: getStockStatus(item.stockLevel, item.reorderLevel),
    margin: calculateMargin(item.unitPrice, item.costPrice),
  };
}

/**
 * Get low stock items for an organization
 */
export async function getLowStockItems(orgId: string, limit: number = 10) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      orgId,
      isActive: true,
      OR: [
        { stockLevel: 0 },
        {
          stockLevel: {
            lte: prisma.inventoryItem.fields.reorderLevel,
          },
        },
      ],
    },
    orderBy: { stockLevel: "asc" },
    take: limit,
  });

  return items.map(formatInventoryItem);
}

/**
 * Get inventory statistics for an organization
 */
export async function getInventoryStats(orgId: string) {
  const [totalItems, outOfStock, lowStock, totalValue] = await Promise.all([
    // Total active items
    prisma.inventoryItem.count({
      where: { orgId, isActive: true },
    }),
    // Out of stock items
    prisma.inventoryItem.count({
      where: { orgId, isActive: true, stockLevel: 0 },
    }),
    // Low stock items (at or below reorder level, but not 0)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "InventoryItem"
      WHERE "orgId" = ${orgId}
        AND "isActive" = true
        AND "stockLevel" > 0
        AND "stockLevel" <= "reorderLevel"
    `,
    // Total inventory value
    prisma.$queryRaw<[{ total: Decimal | null }]>`
      SELECT SUM("stockLevel" * "unitPrice") as total
      FROM "InventoryItem"
      WHERE "orgId" = ${orgId}
        AND "isActive" = true
    `,
  ]);

  return {
    totalItems,
    outOfStock,
    lowStock: Number(lowStock[0]?.count || 0),
    inStock: totalItems - outOfStock - Number(lowStock[0]?.count || 0),
    totalValue: totalValue[0]?.total ? toNumber(totalValue[0].total) : 0,
  };
}

/**
 * Validate SKU uniqueness within organization
 */
export async function isSkuUnique(
  orgId: string,
  sku: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.inventoryItem.findFirst({
    where: {
      orgId,
      sku,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });

  return !existing;
}

/**
 * Get categories used in inventory
 */
export async function getInventoryCategories(orgId: string): Promise<string[]> {
  const result = await prisma.inventoryItem.findMany({
    where: {
      orgId,
      isActive: true,
      category: { not: null },
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return result
    .map((r) => r.category)
    .filter((c): c is string => c !== null);
}

/**
 * Format unit display
 */
export function formatUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    pcs: "pieces",
    kg: "kg",
    g: "grams",
    liters: "liters",
    ml: "ml",
    hours: "hours",
    days: "days",
    meters: "meters",
    sqm: "sq. meters",
    box: "boxes",
    pack: "packs",
  };

  return unitMap[unit] || unit;
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number | Decimal,
  currency: string = "USD"
): string {
  const num = toNumber(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(num);
}
