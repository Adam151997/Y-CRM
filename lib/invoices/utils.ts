import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Generate the next invoice number for an organization
 * Format: INV-XXXX (e.g., INV-0001, INV-0002)
 */
export async function generateInvoiceNumber(orgId: string): Promise<string> {
  // Get the highest invoice number for this org
  const lastInvoice = await prisma.invoice.findFirst({
    where: { orgId },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;

  if (lastInvoice?.invoiceNumber) {
    // Extract the number from the invoice number (e.g., "INV-0042" -> 42)
    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros (4 digits)
  return `INV-${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Invoice item for calculation
 */
export interface InvoiceItemCalc {
  quantity: number | Decimal;
  unitPrice: number | Decimal;
}

/**
 * Calculate invoice totals
 */
export interface InvoiceCalculation {
  subtotal: Decimal;
  taxAmount: Decimal;
  discountAmount: Decimal;
  total: Decimal;
  amountDue: Decimal;
}

/**
 * Calculate invoice totals from items, tax, and discount
 */
export function calculateInvoiceTotals(
  items: InvoiceItemCalc[],
  taxRate?: number | Decimal | null,
  discountType?: string | null,
  discountValue?: number | Decimal | null,
  amountPaid: number | Decimal = 0
): InvoiceCalculation {
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unitPrice);
    return sum + quantity * unitPrice;
  }, 0);

  // Calculate discount
  let discountAmount = 0;
  if (discountValue && discountType) {
    const discountVal = toNumber(discountValue);
    if (discountType === "PERCENTAGE") {
      discountAmount = subtotal * (discountVal / 100);
    } else if (discountType === "FIXED") {
      discountAmount = Math.min(discountVal, subtotal); // Can't discount more than subtotal
    }
  }

  // Subtotal after discount
  const subtotalAfterDiscount = subtotal - discountAmount;

  // Calculate tax (on subtotal after discount)
  let taxAmount = 0;
  if (taxRate) {
    const rate = toNumber(taxRate);
    taxAmount = subtotalAfterDiscount * (rate / 100);
  }

  // Calculate total
  const total = subtotalAfterDiscount + taxAmount;

  // Calculate amount due
  const paid = toNumber(amountPaid);
  const amountDue = Math.max(0, total - paid);

  return {
    subtotal: new Decimal(subtotal.toFixed(2)),
    taxAmount: new Decimal(taxAmount.toFixed(2)),
    discountAmount: new Decimal(discountAmount.toFixed(2)),
    total: new Decimal(total.toFixed(2)),
    amountDue: new Decimal(amountDue.toFixed(2)),
  };
}

/**
 * Calculate item amount
 */
export function calculateItemAmount(
  quantity: number | Decimal,
  unitPrice: number | Decimal
): Decimal {
  const qty = toNumber(quantity);
  const price = toNumber(unitPrice);
  return new Decimal((qty * price).toFixed(2));
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
 * Determine invoice status based on dates and payment
 */
export function determineInvoiceStatus(
  currentStatus: string,
  dueDate: Date,
  amountDue: number | Decimal,
  amountPaid: number | Decimal,
  total: number | Decimal
): string {
  const due = toNumber(amountDue);
  const paid = toNumber(amountPaid);
  const totalAmount = toNumber(total);

  // If cancelled or void, keep that status
  if (currentStatus === "CANCELLED" || currentStatus === "VOID") {
    return currentStatus;
  }

  // If fully paid
  if (due <= 0 && paid >= totalAmount) {
    return "PAID";
  }

  // If partially paid
  if (paid > 0 && due > 0) {
    // Check if overdue
    if (new Date() > dueDate) {
      return "OVERDUE";
    }
    return "PARTIALLY_PAID";
  }

  // Not paid at all
  if (currentStatus === "SENT" || currentStatus === "VIEWED") {
    // Check if overdue
    if (new Date() > dueDate) {
      return "OVERDUE";
    }
    return currentStatus;
  }

  return currentStatus;
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

/**
 * Get status display info
 */
export function getStatusInfo(status: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    DRAFT: {
      label: "Draft",
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
    SENT: {
      label: "Sent",
      color: "text-blue-700",
      bgColor: "bg-blue-100",
    },
    VIEWED: {
      label: "Viewed",
      color: "text-purple-700",
      bgColor: "bg-purple-100",
    },
    PAID: {
      label: "Paid",
      color: "text-green-700",
      bgColor: "bg-green-100",
    },
    PARTIALLY_PAID: {
      label: "Partially Paid",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
    },
    OVERDUE: {
      label: "Overdue",
      color: "text-red-700",
      bgColor: "bg-red-100",
    },
    CANCELLED: {
      label: "Cancelled",
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
    VOID: {
      label: "Void",
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
  };

  return statusMap[status] || statusMap.DRAFT;
}
