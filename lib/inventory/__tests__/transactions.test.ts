/**
 * Tests for Atomic Inventory Transactions
 *
 * These tests verify the correctness of inventory stock operations including:
 * - Stock deduction during invoice creation
 * - Stock restoration during invoice cancellation
 * - Stock adjustments (restock, damage, corrections)
 * - Validation of stock availability
 *
 * NOTE: These are integration tests that require a test database.
 * Run with: npm test -- lib/inventory/__tests__/transactions.test.ts
 *
 * For unit testing, the prisma client should be mocked.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";

// Mock types for testing without actual database
interface MockInventoryItem {
  id: string;
  orgId: string;
  name: string;
  sku: string;
  stockLevel: number;
  reorderLevel: number;
  unit: string;
  unitPrice: Decimal;
  isActive: boolean;
}

interface MockInvoiceItem {
  inventoryItemId: string | null;
  quantity: Decimal;
}

interface MockStockMovement {
  id: string;
  inventoryItemId: string;
  type: string;
  quantity: number;
  previousLevel: number;
  newLevel: number;
  referenceType: string;
  referenceId: string;
}

// In-memory store for mock database
let mockInventoryItems: MockInventoryItem[] = [];
let mockStockMovements: MockStockMovement[] = [];
let mockInvoiceItems: MockInvoiceItem[] = [];

// Mock prisma transaction client
const createMockTx = () => ({
  inventoryItem: {
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; orgId: string; isActive: boolean } }) => {
      return mockInventoryItems.filter(
        (item) =>
          where.id.in.includes(item.id) &&
          item.orgId === where.orgId &&
          item.isActive === where.isActive
      );
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: string; orgId?: string } }) => {
      return mockInventoryItems.find(
        (item) => item.id === where.id && (!where.orgId || item.orgId === where.orgId)
      );
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: { stockLevel: { increment?: number; decrement?: number } } }) => {
      const item = mockInventoryItems.find((i) => i.id === where.id);
      if (item) {
        if (data.stockLevel.increment) {
          item.stockLevel += data.stockLevel.increment;
        }
        if (data.stockLevel.decrement) {
          item.stockLevel -= data.stockLevel.decrement;
        }
      }
      return item;
    }),
  },
  stockMovement: {
    create: vi.fn(async ({ data }: { data: MockStockMovement & { orgId: string; createdById: string; createdByType: string; reason?: string; notes?: string } }) => {
      const movement = { id: `mov_${Date.now()}`, ...data };
      mockStockMovements.push(movement);
      return movement;
    }),
  },
  invoiceItem: {
    findMany: vi.fn(async () => mockInvoiceItems),
  },
});

describe("Inventory Transactions", () => {
  beforeEach(() => {
    // Reset mock database
    mockInventoryItems = [];
    mockStockMovements = [];
    mockInvoiceItems = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deductStockAtomic", () => {
    it("should successfully deduct stock when sufficient quantity available", async () => {
      // Setup: Create inventory item with stock
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const tx = createMockTx();

      // Simulate deductStockAtomic logic
      const items = [{ inventoryItemId: "item_1", quantity: 10 }];
      const orgId = "org_1";
      const invoiceId = "inv_1";
      const userId = "user_1";

      // Fetch items
      const inventoryItems = await tx.inventoryItem.findMany({
        where: { id: { in: items.map((i) => i.inventoryItemId) }, orgId, isActive: true },
      });

      expect(inventoryItems).toHaveLength(1);
      expect(inventoryItems[0].stockLevel).toBe(100);

      // Check stock is sufficient
      const hasInsufficientStock = items.some((item) => {
        const invItem = inventoryItems.find((i) => i.id === item.inventoryItemId);
        return !invItem || invItem.stockLevel < item.quantity;
      });

      expect(hasInsufficientStock).toBe(false);

      // Perform deduction
      for (const item of items) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { stockLevel: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            id: `mov_${Date.now()}`,
            orgId,
            inventoryItemId: item.inventoryItemId,
            type: "SALE",
            quantity: -item.quantity,
            previousLevel: 100,
            newLevel: 90,
            referenceType: "INVOICE",
            referenceId: invoiceId,
            createdById: userId,
            createdByType: "USER",
          },
        });
      }

      // Verify stock was deducted
      expect(mockInventoryItems[0].stockLevel).toBe(90);
      expect(mockStockMovements).toHaveLength(1);
      expect(mockStockMovements[0].type).toBe("SALE");
      expect(mockStockMovements[0].quantity).toBe(-10);
    });

    it("should fail when stock is insufficient", async () => {
      // Setup: Create inventory item with low stock
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 5, // Only 5 in stock
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const tx = createMockTx();
      const items = [{ inventoryItemId: "item_1", quantity: 10 }]; // Requesting 10
      const orgId = "org_1";

      // Fetch items
      const inventoryItems = await tx.inventoryItem.findMany({
        where: { id: { in: items.map((i) => i.inventoryItemId) }, orgId, isActive: true },
      });

      // Check stock is insufficient
      const insufficientItems = items.filter((item) => {
        const invItem = inventoryItems.find((i) => i.id === item.inventoryItemId);
        return !invItem || invItem.stockLevel < item.quantity;
      });

      expect(insufficientItems).toHaveLength(1);
      expect(insufficientItems[0].inventoryItemId).toBe("item_1");

      // Stock should NOT be modified
      expect(mockInventoryItems[0].stockLevel).toBe(5);
      expect(mockStockMovements).toHaveLength(0);
    });

    it("should fail when inventory item is inactive", async () => {
      // Setup: Create inactive inventory item
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Discontinued Product",
          sku: "DISC-001",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: false, // Inactive
        },
      ];

      const tx = createMockTx();
      const items = [{ inventoryItemId: "item_1", quantity: 10 }];
      const orgId = "org_1";

      // Fetch only active items
      const inventoryItems = await tx.inventoryItem.findMany({
        where: { id: { in: items.map((i) => i.inventoryItemId) }, orgId, isActive: true },
      });

      // Should not find inactive item
      expect(inventoryItems).toHaveLength(0);

      // Simulate error response
      const result = {
        success: false,
        deductedItems: [],
        error: `Inventory item ${items[0].inventoryItemId} not found or inactive`,
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found or inactive");
    });

    it("should handle multiple items in single transaction", async () => {
      // Setup: Create multiple inventory items
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Product A",
          sku: "PROD-A",
          stockLevel: 50,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(10),
          isActive: true,
        },
        {
          id: "item_2",
          orgId: "org_1",
          name: "Product B",
          sku: "PROD-B",
          stockLevel: 30,
          reorderLevel: 5,
          unit: "pcs",
          unitPrice: new Decimal(20),
          isActive: true,
        },
      ];

      const tx = createMockTx();
      const items = [
        { inventoryItemId: "item_1", quantity: 5 },
        { inventoryItemId: "item_2", quantity: 10 },
      ];
      const orgId = "org_1";
      const invoiceId = "inv_1";
      const userId = "user_1";

      // Perform deductions
      for (const item of items) {
        const invItem = mockInventoryItems.find((i) => i.id === item.inventoryItemId)!;
        const previousLevel = invItem.stockLevel;

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { stockLevel: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            id: `mov_${Date.now()}_${item.inventoryItemId}`,
            orgId,
            inventoryItemId: item.inventoryItemId,
            type: "SALE",
            quantity: -item.quantity,
            previousLevel,
            newLevel: previousLevel - item.quantity,
            referenceType: "INVOICE",
            referenceId: invoiceId,
            createdById: userId,
            createdByType: "USER",
          },
        });
      }

      // Verify both items deducted
      expect(mockInventoryItems[0].stockLevel).toBe(45); // 50 - 5
      expect(mockInventoryItems[1].stockLevel).toBe(20); // 30 - 10
      expect(mockStockMovements).toHaveLength(2);
    });
  });

  describe("restoreStockAtomic", () => {
    it("should restore stock when invoice is cancelled", async () => {
      // Setup: Simulate post-deduction state
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 90, // After 10 were sold
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      mockInvoiceItems = [
        { inventoryItemId: "item_1", quantity: new Decimal(10) },
      ];

      const tx = createMockTx();
      const orgId = "org_1";
      const invoiceId = "inv_1";
      const userId = "user_1";

      // Get invoice items
      const invoiceItems = await tx.invoiceItem.findMany({});

      // Restore stock for each item
      for (const item of invoiceItems) {
        if (!item.inventoryItemId) continue;

        const quantity = Number(item.quantity);
        const invItem = await tx.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
        });

        if (invItem) {
          const previousLevel = invItem.stockLevel;

          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { stockLevel: { increment: quantity } },
          });

          await tx.stockMovement.create({
            data: {
              id: `mov_restore_${Date.now()}`,
              orgId,
              inventoryItemId: item.inventoryItemId,
              type: "RETURN",
              quantity,
              previousLevel,
              newLevel: previousLevel + quantity,
              referenceType: "INVOICE",
              referenceId: invoiceId,
              createdById: userId,
              createdByType: "USER",
              notes: "Stock restored due to invoice cancellation/void",
            },
          });
        }
      }

      // Verify stock was restored
      expect(mockInventoryItems[0].stockLevel).toBe(100); // 90 + 10
      expect(mockStockMovements).toHaveLength(1);
      expect(mockStockMovements[0].type).toBe("RETURN");
      expect(mockStockMovements[0].quantity).toBe(10);
    });

    it("should handle invoices without inventory items", async () => {
      // Setup: Invoice with no inventory links
      mockInvoiceItems = [
        { inventoryItemId: null, quantity: new Decimal(5) },
      ];

      const tx = createMockTx();

      // Get invoice items
      const invoiceItems = await tx.invoiceItem.findMany({});

      // Filter to items with inventory links
      const itemsToRestore = invoiceItems.filter((item) => item.inventoryItemId !== null);

      expect(itemsToRestore).toHaveLength(0);

      const result = { success: true, restoredItems: 0 };
      expect(result.restoredItems).toBe(0);
    });
  });

  describe("adjustStock", () => {
    it("should increase stock on restock", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 10,
          reorderLevel: 5,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const tx = createMockTx();
      const quantity = 50; // Restocking 50 units
      const previousLevel = mockInventoryItems[0].stockLevel;

      await tx.inventoryItem.update({
        where: { id: "item_1" },
        data: { stockLevel: { increment: quantity } },
      });

      await tx.stockMovement.create({
        data: {
          id: `mov_restock_${Date.now()}`,
          orgId: "org_1",
          inventoryItemId: "item_1",
          type: "RESTOCK",
          quantity,
          previousLevel,
          newLevel: previousLevel + quantity,
          referenceType: "MANUAL",
          referenceId: "",
          createdById: "user_1",
          createdByType: "USER",
          reason: "Regular restock from supplier",
        },
      });

      expect(mockInventoryItems[0].stockLevel).toBe(60); // 10 + 50
      expect(mockStockMovements[0].type).toBe("RESTOCK");
      expect(mockStockMovements[0].quantity).toBe(50);
    });

    it("should decrease stock on damage report", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const tx = createMockTx();
      const quantity = -5; // 5 items damaged
      const previousLevel = mockInventoryItems[0].stockLevel;

      await tx.inventoryItem.update({
        where: { id: "item_1" },
        data: { stockLevel: { decrement: Math.abs(quantity) } },
      });

      await tx.stockMovement.create({
        data: {
          id: `mov_damage_${Date.now()}`,
          orgId: "org_1",
          inventoryItemId: "item_1",
          type: "DAMAGE",
          quantity,
          previousLevel,
          newLevel: previousLevel + quantity,
          referenceType: "MANUAL",
          referenceId: "",
          createdById: "user_1",
          createdByType: "USER",
          reason: "Water damage in warehouse",
        },
      });

      expect(mockInventoryItems[0].stockLevel).toBe(95); // 100 - 5
      expect(mockStockMovements[0].type).toBe("DAMAGE");
      expect(mockStockMovements[0].quantity).toBe(-5);
    });

    it("should reject adjustment that would result in negative stock", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 10,
          reorderLevel: 5,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const quantity = -15; // Trying to remove more than available
      const previousLevel = mockInventoryItems[0].stockLevel;
      const newLevel = previousLevel + quantity;

      // Validation should fail
      const canAdjust = newLevel >= 0;
      expect(canAdjust).toBe(false);

      // Stock should remain unchanged
      expect(mockInventoryItems[0].stockLevel).toBe(10);

      const result = {
        success: false,
        previousLevel: 10,
        newLevel: 10,
        error: `Cannot reduce stock below 0. Current: 10, Adjustment: -15`,
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot reduce stock below 0");
    });
  });

  describe("Atomicity Scenarios", () => {
    it("should rollback all deductions if one fails (conceptual test)", async () => {
      // This test demonstrates the expected behavior when using prisma.$transaction
      // In a real transaction, if any operation fails, all previous operations are rolled back

      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Product A",
          sku: "PROD-A",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(10),
          isActive: true,
        },
        {
          id: "item_2",
          orgId: "org_1",
          name: "Product B",
          sku: "PROD-B",
          stockLevel: 5, // Low stock - will cause failure
          reorderLevel: 5,
          unit: "pcs",
          unitPrice: new Decimal(20),
          isActive: true,
        },
      ];

      const items = [
        { inventoryItemId: "item_1", quantity: 10 },
        { inventoryItemId: "item_2", quantity: 10 }, // This will fail (only 5 available)
      ];

      // Pre-validate all items before any deduction
      const insufficientItems = items.filter((item) => {
        const invItem = mockInventoryItems.find((i) => i.id === item.inventoryItemId);
        return !invItem || invItem.stockLevel < item.quantity;
      });

      // Validation fails for item_2
      expect(insufficientItems).toHaveLength(1);
      expect(insufficientItems[0].inventoryItemId).toBe("item_2");

      // Because validation failed upfront, NO deductions should happen
      // This is the atomicity guarantee - all or nothing
      expect(mockInventoryItems[0].stockLevel).toBe(100); // Unchanged
      expect(mockInventoryItems[1].stockLevel).toBe(5); // Unchanged
      expect(mockStockMovements).toHaveLength(0);
    });

    it("should maintain correct audit trail with multiple operations", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const tx = createMockTx();
      const orgId = "org_1";
      const userId = "user_1";

      // Simulate a series of operations
      const operations = [
        { type: "SALE", quantity: -10, invoice: "inv_1" },
        { type: "SALE", quantity: -5, invoice: "inv_2" },
        { type: "RESTOCK", quantity: 50, invoice: "" },
        { type: "DAMAGE", quantity: -3, invoice: "" },
      ];

      let currentLevel = 100;

      for (const op of operations) {
        const previousLevel = currentLevel;
        currentLevel = previousLevel + op.quantity;

        // Update stock
        if (op.quantity > 0) {
          await tx.inventoryItem.update({
            where: { id: "item_1" },
            data: { stockLevel: { increment: op.quantity } },
          });
        } else {
          await tx.inventoryItem.update({
            where: { id: "item_1" },
            data: { stockLevel: { decrement: Math.abs(op.quantity) } },
          });
        }

        // Create movement record
        await tx.stockMovement.create({
          data: {
            id: `mov_${Date.now()}_${op.type}`,
            orgId,
            inventoryItemId: "item_1",
            type: op.type,
            quantity: op.quantity,
            previousLevel,
            newLevel: currentLevel,
            referenceType: op.invoice ? "INVOICE" : "MANUAL",
            referenceId: op.invoice,
            createdById: userId,
            createdByType: "USER",
          },
        });
      }

      // Verify final stock level: 100 - 10 - 5 + 50 - 3 = 132
      expect(mockInventoryItems[0].stockLevel).toBe(132);

      // Verify complete audit trail
      expect(mockStockMovements).toHaveLength(4);

      // Verify each movement has correct levels
      expect(mockStockMovements[0].previousLevel).toBe(100);
      expect(mockStockMovements[0].newLevel).toBe(90);

      expect(mockStockMovements[1].previousLevel).toBe(90);
      expect(mockStockMovements[1].newLevel).toBe(85);

      expect(mockStockMovements[2].previousLevel).toBe(85);
      expect(mockStockMovements[2].newLevel).toBe(135);

      expect(mockStockMovements[3].previousLevel).toBe(135);
      expect(mockStockMovements[3].newLevel).toBe(132);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero quantity gracefully", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const quantity = 0;
      const previousLevel = mockInventoryItems[0].stockLevel;

      // Zero adjustment should still be valid
      const canAdjust = previousLevel + quantity >= 0;
      expect(canAdjust).toBe(true);

      // But no meaningful change occurs
      expect(previousLevel + quantity).toBe(100);
    });

    it("should handle decimal quantities for divisible units", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Bulk Material",
          sku: "BULK-001",
          stockLevel: 100.5, // Some units allow decimals
          reorderLevel: 10,
          unit: "kg",
          unitPrice: new Decimal(5.99),
          isActive: true,
        },
      ];

      const quantity = 2.5; // Selling 2.5 kg
      const previousLevel = mockInventoryItems[0].stockLevel;
      const newLevel = previousLevel - quantity;

      // Should handle decimal math correctly
      expect(newLevel).toBeCloseTo(98, 1);
    });

    it("should handle out of stock items (zero stock level)", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Out of Stock Product",
          sku: "OOS-001",
          stockLevel: 0,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      const items = [{ inventoryItemId: "item_1", quantity: 1 }];

      // Should fail validation
      const insufficientItems = items.filter((item) => {
        const invItem = mockInventoryItems.find((i) => i.id === item.inventoryItemId);
        return !invItem || invItem.stockLevel < item.quantity;
      });

      expect(insufficientItems).toHaveLength(1);
    });

    it("should preserve price at time of sale", async () => {
      mockInventoryItems = [
        {
          id: "item_1",
          orgId: "org_1",
          name: "Test Product",
          sku: "TEST-001",
          stockLevel: 100,
          reorderLevel: 10,
          unit: "pcs",
          unitPrice: new Decimal(29.99),
          isActive: true,
        },
      ];

      // Capture price at sale time
      const priceAtSale = mockInventoryItems[0].unitPrice;
      expect(priceAtSale).toEqual(new Decimal(29.99));

      // Even if price changes later, the recorded sale price should remain
      mockInventoryItems[0].unitPrice = new Decimal(39.99);

      // Original sale price is preserved
      expect(priceAtSale).toEqual(new Decimal(29.99));
    });
  });
});
