/**
 * Inventory Tools for Sales Workspace
 * Enables AI to manage inventory items, check stock, and adjust stock levels
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { checkPermission } from "@/lib/permissions";
import { logToolExecution, handleToolError } from "../helpers";
import {
  formatInventoryItem,
  getStockStatus,
  getInventoryStats,
} from "@/lib/inventory/utils";
import { adjustStock, createInitialStockMovement } from "@/lib/inventory/transactions";

export function createInventoryTools(orgId: string, userId: string) {
  return {
    createInventoryItem: createInventoryItemTool(orgId, userId),
    searchInventory: searchInventoryTool(orgId, userId),
    checkStock: checkStockTool(orgId, userId),
    adjustStock: adjustStockTool(orgId, userId),
    getLowStockItems: getLowStockItemsTool(orgId, userId),
    getInventoryStats: getInventoryStatsTool(orgId, userId),
  };
}

/**
 * Create a new inventory item
 */
const createInventoryItemTool = (orgId: string, userId: string) =>
  tool({
    description:
      "Create a new inventory item. Use this when the user wants to add a product or item to inventory. Requires name, SKU, and unit price.",
    parameters: z.object({
      name: z.string().describe("Product/item name (required)"),
      sku: z.string().describe("Stock Keeping Unit - unique identifier (required, alphanumeric with hyphens/underscores)"),
      unitPrice: z.number().describe("Price per unit in default currency (required)"),
      stockLevel: z.number().optional().describe("Initial stock quantity (default: 0)"),
      reorderLevel: z.number().optional().describe("Stock level threshold for low stock alerts (default: 0)"),
      costPrice: z.number().optional().describe("Cost price per unit (for margin calculation)"),
      category: z.string().optional().describe("Product category (e.g., 'Electronics', 'Office Supplies')"),
      unit: z.string().optional().describe("Unit of measurement: pcs, kg, liters, hours, etc. (default: pcs)"),
      description: z.string().optional().describe("Product description"),
    }),
    execute: async (params) => {
      logToolExecution("createInventoryItem", params);
      try {
        // Check permission
        const hasPermission = await checkPermission(userId, orgId, "inventory", "create");
        if (!hasPermission) {
          return {
            success: false,
            errorCode: "PERMISSION_DENIED",
            message: "You don't have permission to create inventory items.",
          };
        }

        // Check for duplicate SKU
        const existingSku = await prisma.inventoryItem.findFirst({
          where: {
            orgId,
            sku: params.sku,
          },
        });

        if (existingSku) {
          return {
            success: false,
            errorCode: "DUPLICATE",
            message: `SKU "${params.sku}" already exists for item "${existingSku.name}". Please use a unique SKU.`,
          };
        }

        // Create inventory item with transaction for initial stock movement
        const item = await prisma.$transaction(async (tx) => {
          const newItem = await tx.inventoryItem.create({
            data: {
              orgId,
              name: params.name,
              sku: params.sku,
              unitPrice: params.unitPrice,
              stockLevel: params.stockLevel || 0,
              reorderLevel: params.reorderLevel || 0,
              costPrice: params.costPrice,
              category: params.category,
              unit: params.unit || "pcs",
              description: params.description,
              createdById: userId,
              createdByType: "AI_AGENT",
            },
          });

          // Create initial stock movement if stock > 0
          if (params.stockLevel && params.stockLevel > 0) {
            await createInitialStockMovement(
              tx,
              orgId,
              newItem.id,
              params.stockLevel,
              userId,
              "AI_AGENT"
            );
          }

          return newItem;
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "INVENTORY",
          recordId: item.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: item as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        const stockStatus = getStockStatus(item.stockLevel, item.reorderLevel);

        return {
          success: true,
          itemId: item.id,
          sku: item.sku,
          stockStatus,
          message: `Created inventory item "${item.name}" (SKU: ${item.sku}) with ${item.stockLevel} ${item.unit} in stock at $${item.unitPrice} per ${item.unit}.`,
        };
      } catch (error) {
        return handleToolError(error, "createInventoryItem");
      }
    },
  });

/**
 * Search inventory items
 */
const searchInventoryTool = (orgId: string, userId: string) =>
  tool({
    description:
      "Search for inventory items by name, SKU, or category. Use this to find products in inventory.",
    parameters: z.object({
      query: z.string().optional().describe("Search term to match against name, SKU, or description"),
      category: z.string().optional().describe("Filter by category"),
      stockStatus: z.string().optional().describe("Filter by stock status: IN_STOCK, LOW_STOCK, or OUT_OF_STOCK"),
      limit: z.number().optional().describe("Maximum number of results (1-20, default 10)"),
    }),
    execute: async ({ query, category, stockStatus, limit = 10 }) => {
      logToolExecution("searchInventory", { query, category, stockStatus, limit });
      try {
        // Check permission
        const hasPermission = await checkPermission(userId, orgId, "inventory", "view");
        if (!hasPermission) {
          return {
            success: false,
            errorCode: "PERMISSION_DENIED",
            message: "You don't have permission to view inventory.",
          };
        }

        const where: Record<string, unknown> = {
          orgId,
          isActive: true,
        };

        if (category) {
          where.category = { contains: category, mode: "insensitive" };
        }

        if (query) {
          where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ];
        }

        let items = await prisma.inventoryItem.findMany({
          where,
          take: Math.min(limit, 20),
          orderBy: { name: "asc" },
        });

        // Filter by stock status if specified
        if (stockStatus) {
          items = items.filter((item) => {
            const status = getStockStatus(item.stockLevel, item.reorderLevel);
            return status === stockStatus;
          });
        }

        const formattedItems = items.map((item) => {
          const formatted = formatInventoryItem(item);
          return {
            id: item.id,
            name: item.name,
            sku: item.sku,
            stockLevel: item.stockLevel,
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            category: item.category,
            stockStatus: formatted.stockStatus,
          };
        });

        return {
          success: true,
          count: formattedItems.length,
          items: formattedItems,
          message:
            formattedItems.length > 0
              ? `Found ${formattedItems.length} inventory item(s).`
              : "No inventory items found matching your criteria.",
        };
      } catch (error) {
        return handleToolError(error, "searchInventory");
      }
    },
  });

/**
 * Check stock level for specific items
 */
const checkStockTool = (orgId: string, userId: string) =>
  tool({
    description:
      "Check the current stock level for one or more inventory items. Use this before creating invoices to verify availability.",
    parameters: z.object({
      skus: z.array(z.string()).optional().describe("List of SKUs to check (e.g., ['SKU-001', 'SKU-002'])"),
      itemIds: z.array(z.string()).optional().describe("List of inventory item IDs to check"),
      name: z.string().optional().describe("Search by item name"),
    }),
    execute: async ({ skus, itemIds, name }) => {
      logToolExecution("checkStock", { skus, itemIds, name });
      try {
        // Check permission
        const hasPermission = await checkPermission(userId, orgId, "inventory", "view");
        if (!hasPermission) {
          return {
            success: false,
            errorCode: "PERMISSION_DENIED",
            message: "You don't have permission to view inventory.",
          };
        }

        const where: Record<string, unknown> = {
          orgId,
          isActive: true,
        };

        if (skus && skus.length > 0) {
          where.sku = { in: skus };
        } else if (itemIds && itemIds.length > 0) {
          where.id = { in: itemIds };
        } else if (name) {
          where.name = { contains: name, mode: "insensitive" };
        } else {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: "Please provide SKUs, item IDs, or a name to search for.",
          };
        }

        const items = await prisma.inventoryItem.findMany({
          where,
          select: {
            id: true,
            name: true,
            sku: true,
            stockLevel: true,
            reorderLevel: true,
            unit: true,
            unitPrice: true,
          },
        });

        if (items.length === 0) {
          return {
            success: false,
            errorCode: "NOT_FOUND",
            message: "No inventory items found matching your criteria.",
          };
        }

        const stockInfo = items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          stockLevel: item.stockLevel,
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          stockStatus: getStockStatus(item.stockLevel, item.reorderLevel),
          available: item.stockLevel > 0,
        }));

        const outOfStock = stockInfo.filter((i) => i.stockStatus === "OUT_OF_STOCK");
        const lowStock = stockInfo.filter((i) => i.stockStatus === "LOW_STOCK");

        let statusMessage = `Checked ${stockInfo.length} item(s).`;
        if (outOfStock.length > 0) {
          statusMessage += ` ${outOfStock.length} out of stock.`;
        }
        if (lowStock.length > 0) {
          statusMessage += ` ${lowStock.length} low on stock.`;
        }

        return {
          success: true,
          items: stockInfo,
          summary: {
            total: stockInfo.length,
            inStock: stockInfo.filter((i) => i.stockStatus === "IN_STOCK").length,
            lowStock: lowStock.length,
            outOfStock: outOfStock.length,
          },
          message: statusMessage,
        };
      } catch (error) {
        return handleToolError(error, "checkStock");
      }
    },
  });

/**
 * Adjust stock level (restock, damage, correction)
 */
const adjustStockTool = (orgId: string, userId: string) =>
  tool({
    description:
      "Adjust the stock level of an inventory item. Use for restocking, recording damaged goods, or making corrections. Requires a reason.",
    parameters: z.object({
      sku: z.string().optional().describe("SKU of the item to adjust"),
      itemId: z.string().optional().describe("ID of the item to adjust"),
      quantity: z.number().describe("Quantity to add (positive) or remove (negative)"),
      type: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGE"]).describe("Type of adjustment: RESTOCK (adding stock), ADJUSTMENT (correction), DAMAGE (removing damaged goods)"),
      reason: z.string().describe("Reason for the adjustment (required)"),
      notes: z.string().optional().describe("Additional notes"),
    }),
    execute: async ({ sku, itemId, quantity, type, reason, notes }) => {
      logToolExecution("adjustStock", { sku, itemId, quantity, type, reason });
      try {
        // Check permission
        const hasPermission = await checkPermission(userId, orgId, "inventory", "edit");
        if (!hasPermission) {
          return {
            success: false,
            errorCode: "PERMISSION_DENIED",
            message: "You don't have permission to adjust inventory stock.",
          };
        }

        // Find the inventory item
        let item;
        if (itemId) {
          item = await prisma.inventoryItem.findFirst({
            where: { id: itemId, orgId, isActive: true },
          });
        } else if (sku) {
          item = await prisma.inventoryItem.findFirst({
            where: { sku, orgId, isActive: true },
          });
        } else {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: "Please provide either an item ID or SKU.",
          };
        }

        if (!item) {
          return {
            success: false,
            errorCode: "NOT_FOUND",
            message: `Inventory item not found.`,
          };
        }

        // Perform the adjustment
        const result = await adjustStock(
          orgId,
          item.id,
          quantity,
          type,
          reason,
          userId,
          "AI_AGENT",
          notes
        );

        if (!result.success) {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: result.error || "Failed to adjust stock",
          };
        }

        const newStatus = getStockStatus(result.newLevel, item.reorderLevel);
        const direction = quantity > 0 ? "added" : "removed";
        const absQuantity = Math.abs(quantity);

        return {
          success: true,
          itemId: item.id,
          sku: item.sku,
          previousLevel: result.previousLevel,
          newLevel: result.newLevel,
          stockStatus: newStatus,
          message: `${type}: ${direction} ${absQuantity} ${item.unit} ${quantity > 0 ? "to" : "from"} "${item.name}" (${item.sku}). Stock: ${result.previousLevel} → ${result.newLevel} ${item.unit}.`,
        };
      } catch (error) {
        return handleToolError(error, "adjustStock");
      }
    },
  });

/**
 * Get items with low stock
 */
const getLowStockItemsTool = (orgId: string, userId: string) =>
  tool({
    description:
      "Get a list of inventory items that are low on stock or out of stock. Useful for reordering decisions.",
    parameters: z.object({
      includeOutOfStock: z.boolean().optional().describe("Include items with zero stock (default: true)"),
      limit: z.number().optional().describe("Maximum number of results (default: 20)"),
    }),
    execute: async ({ includeOutOfStock = true, limit = 20 }) => {
      logToolExecution("getLowStockItems", { includeOutOfStock, limit });
      try {
        // Check permission
        const hasPermission = await checkPermission(userId, orgId, "inventory", "view");
        if (!hasPermission) {
          return {
            success: false,
            errorCode: "PERMISSION_DENIED",
            message: "You don't have permission to view inventory.",
          };
        }

        // Get items at or below reorder level
        const items = await prisma.$queryRaw<
          Array<{
            id: string;
            name: string;
            sku: string;
            stockLevel: number;
            reorderLevel: number;
            unit: string;
            unitPrice: number;
            category: string | null;
          }>
        >`
          SELECT id, name, sku, "stockLevel", "reorderLevel", unit, "unitPrice"::numeric, category
          FROM "InventoryItem"
          WHERE "orgId" = ${orgId}
            AND "isActive" = true
            AND (
              "stockLevel" <= "reorderLevel"
              ${includeOutOfStock ? prisma.$queryRaw`` : prisma.$queryRaw`AND "stockLevel" > 0`}
            )
          ORDER BY "stockLevel" ASC
          LIMIT ${limit}
        `;

        const formattedItems = items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          stockLevel: item.stockLevel,
          reorderLevel: item.reorderLevel,
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          category: item.category,
          stockStatus: getStockStatus(item.stockLevel, item.reorderLevel),
          shortfall: Math.max(0, item.reorderLevel - item.stockLevel),
        }));

        const outOfStock = formattedItems.filter((i) => i.stockLevel === 0);
        const lowStock = formattedItems.filter((i) => i.stockLevel > 0);

        return {
          success: true,
          count: formattedItems.length,
          items: formattedItems,
          summary: {
            outOfStock: outOfStock.length,
            lowStock: lowStock.length,
          },
          message:
            formattedItems.length > 0
              ? `Found ${outOfStock.length} out of stock and ${lowStock.length} low stock item(s).`
              : "All inventory items are sufficiently stocked.",
        };
      } catch (error) {
        return handleToolError(error, "getLowStockItems");
      }
    },
  });

/**
 * Get inventory statistics
 */
const getInventoryStatsTool = (orgId: string, userId: string) =>
  tool({
    description:
      "Get overall inventory statistics including total items, stock status breakdown, and total inventory value.",
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("getInventoryStats", {});
      try {
        // Check permission
        const hasPermission = await checkPermission(userId, orgId, "inventory", "view");
        if (!hasPermission) {
          return {
            success: false,
            errorCode: "PERMISSION_DENIED",
            message: "You don't have permission to view inventory.",
          };
        }

        const stats = await getInventoryStats(orgId);

        return {
          success: true,
          stats: {
            totalItems: stats.totalItems,
            inStock: stats.inStock,
            lowStock: stats.lowStock,
            outOfStock: stats.outOfStock,
            totalValue: stats.totalValue,
          },
          message: `Inventory: ${stats.totalItems} items total. ${stats.inStock} in stock, ${stats.lowStock} low, ${stats.outOfStock} out of stock. Total value: $${stats.totalValue.toFixed(2)}.`,
        };
      } catch (error) {
        return handleToolError(error, "getInventoryStats");
      }
    },
  });
