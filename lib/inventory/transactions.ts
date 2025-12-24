import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { checkStockAvailability } from "./utils";
import type { StockMovementType } from "@/lib/validation/inventory";

/**
 * Stock deduction request for invoice creation
 */
export interface StockDeductionItem {
  inventoryItemId: string;
  quantity: number;
}

/**
 * Result of atomic stock deduction
 */
export interface StockDeductionResult {
  success: boolean;
  deductedItems: Array<{
    inventoryItemId: string;
    quantity: number;
    previousLevel: number;
    newLevel: number;
    priceAtSale: Decimal;
  }>;
  error?: string;
  insufficientStock?: Array<{
    inventoryItemId: string;
    name: string;
    sku: string;
    available: number;
    requested: number;
  }>;
}

/**
 * Atomically deduct stock for invoice items within a transaction
 * This function should be called within a prisma.$transaction block
 *
 * @param tx - Prisma transaction client
 * @param orgId - Organization ID
 * @param items - Items to deduct
 * @param invoiceId - Invoice ID for reference
 * @param userId - User performing the action
 * @param userType - USER or AI_AGENT
 */
export async function deductStockAtomic(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orgId: string,
  items: StockDeductionItem[],
  invoiceId: string,
  userId: string,
  userType: string = "USER"
): Promise<StockDeductionResult> {
  const deductedItems: StockDeductionResult["deductedItems"] = [];

  // First, fetch all items and validate stock levels
  const inventoryItems = await tx.inventoryItem.findMany({
    where: {
      id: { in: items.map((i) => i.inventoryItemId) },
      orgId,
      isActive: true,
    },
  });

  const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));

  // Validate all items have sufficient stock
  const insufficientStock: StockDeductionResult["insufficientStock"] = [];

  for (const item of items) {
    const inventoryItem = itemMap.get(item.inventoryItemId);

    if (!inventoryItem) {
      return {
        success: false,
        deductedItems: [],
        error: `Inventory item ${item.inventoryItemId} not found or inactive`,
      };
    }

    if (inventoryItem.stockLevel < item.quantity) {
      insufficientStock.push({
        inventoryItemId: inventoryItem.id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        available: inventoryItem.stockLevel,
        requested: item.quantity,
      });
    }
  }

  // If any item has insufficient stock, fail the entire operation
  if (insufficientStock.length > 0) {
    const errorItems = insufficientStock
      .map((i) => `${i.name} (${i.sku}): need ${i.requested}, have ${i.available}`)
      .join("; ");

    return {
      success: false,
      deductedItems: [],
      error: `Insufficient stock for: ${errorItems}`,
      insufficientStock,
    };
  }

  // All validations passed - proceed with atomic deductions
  for (const item of items) {
    const inventoryItem = itemMap.get(item.inventoryItemId)!;
    const previousLevel = inventoryItem.stockLevel;
    const newLevel = previousLevel - item.quantity;

    // Update stock level using atomic decrement
    await tx.inventoryItem.update({
      where: { id: item.inventoryItemId },
      data: {
        stockLevel: { decrement: item.quantity },
      },
    });

    // Create stock movement record
    await tx.stockMovement.create({
      data: {
        orgId,
        inventoryItemId: item.inventoryItemId,
        type: "SALE",
        quantity: -item.quantity, // Negative for deduction
        previousLevel,
        newLevel,
        referenceType: "INVOICE",
        referenceId: invoiceId,
        createdById: userId,
        createdByType: userType,
      },
    });

    deductedItems.push({
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      previousLevel,
      newLevel,
      priceAtSale: inventoryItem.unitPrice,
    });
  }

  return {
    success: true,
    deductedItems,
  };
}

/**
 * Atomically restore stock for cancelled/voided invoice
 *
 * @param tx - Prisma transaction client
 * @param orgId - Organization ID
 * @param invoiceId - Invoice ID to restore stock for
 * @param userId - User performing the action
 * @param userType - USER or AI_AGENT
 */
export async function restoreStockAtomic(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orgId: string,
  invoiceId: string,
  userId: string,
  userType: string = "USER"
): Promise<{ success: boolean; restoredItems: number; error?: string }> {
  // Get all invoice items that have inventory links
  const invoiceItems = await tx.invoiceItem.findMany({
    where: {
      invoice: {
        id: invoiceId,
        orgId,
      },
      inventoryItemId: { not: null },
    },
    select: {
      inventoryItemId: true,
      quantity: true,
    },
  });

  if (invoiceItems.length === 0) {
    return { success: true, restoredItems: 0 };
  }

  let restoredCount = 0;

  for (const item of invoiceItems) {
    if (!item.inventoryItemId) continue;

    const quantity = Number(item.quantity);

    // Get current stock level
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: { id: item.inventoryItemId },
      select: { stockLevel: true },
    });

    if (!inventoryItem) continue;

    const previousLevel = inventoryItem.stockLevel;
    const newLevel = previousLevel + quantity;

    // Restore stock using atomic increment
    await tx.inventoryItem.update({
      where: { id: item.inventoryItemId },
      data: {
        stockLevel: { increment: quantity },
      },
    });

    // Create stock movement record for the return
    await tx.stockMovement.create({
      data: {
        orgId,
        inventoryItemId: item.inventoryItemId,
        type: "RETURN",
        quantity: quantity, // Positive for restoration
        previousLevel,
        newLevel,
        referenceType: "INVOICE",
        referenceId: invoiceId,
        notes: "Stock restored due to invoice cancellation/void",
        createdById: userId,
        createdByType: userType,
      },
    });

    restoredCount++;
  }

  return {
    success: true,
    restoredItems: restoredCount,
  };
}

/**
 * Manually adjust stock level (for restocking, damage, corrections)
 *
 * @param orgId - Organization ID
 * @param inventoryItemId - Item to adjust
 * @param quantity - Quantity to add (positive) or remove (negative)
 * @param type - Type of adjustment
 * @param reason - Reason for adjustment
 * @param userId - User performing the action
 * @param userType - USER or AI_AGENT
 * @param notes - Optional notes
 */
export async function adjustStock(
  orgId: string,
  inventoryItemId: string,
  quantity: number,
  type: "RESTOCK" | "ADJUSTMENT" | "DAMAGE",
  reason: string,
  userId: string,
  userType: string = "USER",
  notes?: string
): Promise<{
  success: boolean;
  previousLevel: number;
  newLevel: number;
  error?: string;
}> {
  return prisma.$transaction(async (tx) => {
    // Get current item
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId, orgId },
      select: { stockLevel: true, isActive: true },
    });

    if (!item) {
      return {
        success: false,
        previousLevel: 0,
        newLevel: 0,
        error: "Inventory item not found",
      };
    }

    if (!item.isActive) {
      return {
        success: false,
        previousLevel: item.stockLevel,
        newLevel: item.stockLevel,
        error: "Cannot adjust stock for inactive item",
      };
    }

    const previousLevel = item.stockLevel;
    const newLevel = previousLevel + quantity;

    // Validate new level won't be negative
    if (newLevel < 0) {
      return {
        success: false,
        previousLevel,
        newLevel: previousLevel,
        error: `Cannot reduce stock below 0. Current: ${previousLevel}, Adjustment: ${quantity}`,
      };
    }

    // Update stock level
    if (quantity > 0) {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { stockLevel: { increment: quantity } },
      });
    } else {
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { stockLevel: { decrement: Math.abs(quantity) } },
      });
    }

    // Create stock movement record
    await tx.stockMovement.create({
      data: {
        orgId,
        inventoryItemId,
        type,
        quantity,
        previousLevel,
        newLevel,
        referenceType: "MANUAL",
        reason,
        notes,
        createdById: userId,
        createdByType: userType,
      },
    });

    return {
      success: true,
      previousLevel,
      newLevel,
    };
  });
}

/**
 * Create initial stock movement when item is created
 */
export async function createInitialStockMovement(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orgId: string,
  inventoryItemId: string,
  initialStock: number,
  userId: string,
  userType: string = "USER"
): Promise<void> {
  if (initialStock > 0) {
    await tx.stockMovement.create({
      data: {
        orgId,
        inventoryItemId,
        type: "INITIAL",
        quantity: initialStock,
        previousLevel: 0,
        newLevel: initialStock,
        referenceType: "MANUAL",
        reason: "Initial stock on item creation",
        createdById: userId,
        createdByType: userType,
      },
    });
  }
}

/**
 * Pre-validate stock for invoice creation
 * Call this BEFORE starting the transaction to give early feedback
 */
export async function validateStockForInvoice(
  orgId: string,
  items: Array<{ inventoryItemId?: string; quantity: number }>
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  // Filter to only inventory-linked items
  const inventoryItems = items.filter(
    (item): item is { inventoryItemId: string; quantity: number } =>
      !!item.inventoryItemId
  );

  if (inventoryItems.length === 0) {
    return { valid: true, errors: [] };
  }

  const stockCheck = await checkStockAvailability(orgId, inventoryItems);

  if (!stockCheck.valid) {
    const errors = stockCheck.insufficientItems.map(
      (item) =>
        `Insufficient stock for "${item.name}" (${item.sku}): need ${
          stockCheck.items.find((i) => i.inventoryItemId === item.inventoryItemId)
            ?.requestedQuantity || 0
        }, available ${
          stockCheck.items.find((i) => i.inventoryItemId === item.inventoryItemId)
            ?.availableStock || 0
        }`
    );

    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
