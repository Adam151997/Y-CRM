import { z } from "zod";

/**
 * Stock Movement Types
 */
export const STOCK_MOVEMENT_TYPES = [
  "SALE",        // Deducted due to invoice/sale
  "RESTOCK",     // Added from supplier/purchase
  "ADJUSTMENT",  // Manual correction (positive or negative)
  "RETURN",      // Returned from cancelled invoice
  "INITIAL",     // Initial stock when item created
  "DAMAGE",      // Lost/damaged goods
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/**
 * Stock Movement Reference Types
 */
export const REFERENCE_TYPES = [
  "INVOICE",
  "MANUAL",
  "IMPORT",
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];

/**
 * Inventory Unit Types
 */
export const INVENTORY_UNITS = [
  "pcs",      // Pieces
  "kg",       // Kilograms
  "g",        // Grams
  "liters",   // Liters
  "ml",       // Milliliters
  "hours",    // Service hours
  "days",     // Service days
  "meters",   // Meters
  "sqm",      // Square meters
  "box",      // Boxes
  "pack",     // Packs
] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

/**
 * Create inventory item schema
 */
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  sku: z.string()
    .min(1, "SKU is required")
    .max(100, "SKU too long")
    .regex(/^[A-Za-z0-9_-]+$/, "SKU can only contain letters, numbers, hyphens and underscores"),
  description: z.string().optional(),

  // Stock Management
  stockLevel: z.number().int().min(0, "Stock level cannot be negative").default(0),
  reorderLevel: z.number().int().min(0, "Reorder level cannot be negative").default(0),
  unit: z.string().default("pcs"),

  // Pricing
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  costPrice: z.number().min(0, "Cost price must be 0 or greater").optional(),

  // Organization
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),

  // Status
  isActive: z.boolean().default(true),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

/**
 * Update inventory item schema
 */
export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "SKU can only contain letters, numbers, hyphens and underscores")
    .optional(),
  description: z.string().nullable().optional(),

  // Pricing (stock level is updated separately via adjustments)
  reorderLevel: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  unitPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).nullable().optional(),

  // Organization
  category: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),

  // Status
  isActive: z.boolean().optional(),
});

export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

/**
 * Stock adjustment schema - for manual stock changes
 */
export const stockAdjustmentSchema = z.object({
  quantity: z.number().int().refine(val => val !== 0, "Quantity cannot be zero"),
  type: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGE"]),
  reason: z.string().min(1, "Reason is required for stock adjustments").max(500),
  notes: z.string().max(1000).optional(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

/**
 * Inventory filters schema
 */
export const inventoryFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(), // Filter items at or below reorder level
  outOfStock: z.coerce.boolean().optional(), // Filter items with 0 stock
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["name", "sku", "stockLevel", "unitPrice", "category", "createdAt", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;

/**
 * Stock check schema - validate stock availability for invoice items
 */
export const stockCheckSchema = z.object({
  items: z.array(z.object({
    inventoryItemId: z.string().min(1, "Inventory item ID is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  })).min(1, "At least one item is required"),
});

export type StockCheckInput = z.infer<typeof stockCheckSchema>;

/**
 * Stock check result type
 */
export interface StockCheckResult {
  valid: boolean;
  items: Array<{
    inventoryItemId: string;
    name: string;
    sku: string;
    requestedQuantity: number;
    availableStock: number;
    sufficient: boolean;
    shortfall?: number;
  }>;
  insufficientItems: Array<{
    inventoryItemId: string;
    name: string;
    sku: string;
    shortfall: number;
  }>;
}

/**
 * Inventory item with stock status - for display
 */
export interface InventoryItemWithStatus {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  stockLevel: number;
  reorderLevel: number;
  unit: string;
  unitPrice: number;
  costPrice: number | null;
  category: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  stockStatus: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";
  margin: number | null; // (unitPrice - costPrice) / unitPrice * 100
}

/**
 * Bulk import schema for inventory items
 */
export const bulkInventoryImportSchema = z.object({
  items: z.array(createInventoryItemSchema).min(1, "At least one item is required").max(500, "Maximum 500 items per import"),
  skipDuplicates: z.boolean().default(false), // Skip items with duplicate SKUs
  updateExisting: z.boolean().default(false), // Update existing items instead of skipping
});

export type BulkInventoryImportInput = z.infer<typeof bulkInventoryImportSchema>;

/**
 * Stock movement filters schema
 */
export const stockMovementFiltersSchema = z.object({
  inventoryItemId: z.string().optional(),
  type: z.enum(STOCK_MOVEMENT_TYPES).optional(),
  referenceType: z.enum(REFERENCE_TYPES).optional(),
  referenceId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type StockMovementFilters = z.infer<typeof stockMovementFiltersSchema>;

/**
 * Invoice item with inventory - extended schema for invoice creation
 */
export const invoiceItemWithInventorySchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  itemCode: z.string().optional(),
  sortOrder: z.number().optional(),
  // Inventory fields
  inventoryItemId: z.string().optional(), // Link to inventory (optional for service items)
  deductFromStock: z.boolean().default(true), // Whether to deduct from stock
});

export type InvoiceItemWithInventoryInput = z.infer<typeof invoiceItemWithInventorySchema>;
