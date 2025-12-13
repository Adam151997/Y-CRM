/**
 * Client-safe invoice utilities
 * These functions can be used in client components
 */

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
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
