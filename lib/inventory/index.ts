/**
 * Inventory Module
 *
 * Provides atomic inventory management with invoice integration.
 * Key features:
 * - Stock level tracking with reorder alerts
 * - Atomic stock deduction during invoice creation
 * - Stock restoration on invoice cancellation/void
 * - Full audit trail via StockMovement records
 */

// Utility functions
export {
  generateSKU,
  checkStockAvailability,
  getStockStatus,
  getStockStatusInfo,
  calculateMargin,
  formatInventoryItem,
  getLowStockItems,
  getInventoryStats,
  isSkuUnique,
  getInventoryCategories,
  formatUnit,
  formatCurrency,
} from "./utils";

// Transaction functions
export {
  deductStockAtomic,
  restoreStockAtomic,
  adjustStock,
  createInitialStockMovement,
  validateStockForInvoice,
  type StockDeductionItem,
  type StockDeductionResult,
} from "./transactions";
