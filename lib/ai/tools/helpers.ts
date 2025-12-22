/**
 * Shared helper functions for AI tools
 */

import prisma from "@/lib/db";
import { resolveUser } from "@/lib/user-resolver";

/**
 * Parse natural language date expressions
 */
export function parseNaturalDate(input: string): Date | null {
  const lower = input.toLowerCase().trim();
  const now = new Date();

  if (lower === "today") {
    return now;
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (lower === "next week") {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }
  if (lower.startsWith("in ")) {
    const match = lower.match(/in (\d+) (day|days|week|weeks)/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].startsWith("week") ? 7 : 1;
      const future = new Date(now);
      future.setDate(future.getDate() + amount * unit);
      return future;
    }
  }

  return null;
}

/**
 * Check for duplicate record created in last 60 seconds
 */
export async function checkRecentDuplicate<T extends { id: string }>(
  model: { findFirst: (args: unknown) => Promise<T | null> },
  where: Record<string, unknown>
): Promise<T | null> {
  return model.findFirst({
    where: {
      ...where,
      createdAt: { gte: new Date(Date.now() - 60000) },
    },
  }) as Promise<T | null>;
}

/**
 * Resolve user assignment
 */
export async function resolveAssignment(
  orgId: string,
  assignTo: string | undefined,
  currentUserId: string
): Promise<{ id: string; name: string } | null> {
  if (!assignTo) return null;

  const resolved = await resolveUser(orgId, assignTo, currentUserId);
  if (resolved) {
    return { id: resolved.id, name: resolved.name };
  }
  return null;
}

/**
 * Build search where clause for common patterns
 */
export function buildSearchWhere(
  orgId: string,
  query?: string,
  searchFields?: string[]
): Record<string, unknown> {
  const where: Record<string, unknown> = { orgId };

  if (query && searchFields && searchFields.length > 0) {
    where.OR = searchFields.map(field => ({
      [field]: { contains: query, mode: "insensitive" },
    }));
  }

  return where;
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number | bigint, currency = "USD"): string {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  });
}

/**
 * Calculate days until a date
 */
export function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Get date range filter based on natural language
 */
export function getDateRangeFilter(range: string): { gte?: Date; lte?: Date } | undefined {
  const now = new Date();

  switch (range) {
    case "today":
      return { gte: new Date(now.setHours(0, 0, 0, 0)) };
    case "week":
      return { gte: new Date(now.setDate(now.getDate() - 7)) };
    case "month":
      return { gte: new Date(now.setMonth(now.getMonth() - 1)) };
    case "quarter":
      return { gte: new Date(now.setMonth(now.getMonth() - 3)) };
    case "year":
      return { gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
    default:
      return undefined;
  }
}

/**
 * Standard error handler for tools
 */
export function handleToolError(error: unknown, toolName: string): {
  success: false;
  message: string;
} {
  console.error(`[Tool:${toolName}] Error:`, error);
  return {
    success: false,
    message: error instanceof Error ? error.message : "Unknown error",
  };
}

/**
 * Log tool execution
 */
export function logToolExecution(toolName: string, params: unknown): void {
  console.log(`[Tool:${toolName}] Executing:`, JSON.stringify(params));
}

/**
 * Create duplicate detection result
 */
export function createDuplicateResult<T extends { id: string }>(
  entity: T,
  entityType: string,
  displayName: string
): Record<string, unknown> {
  const idKey = `${entityType.toLowerCase()}Id`;
  return {
    success: true,
    [idKey]: entity.id,
    alreadyExisted: true,
    message: `${entityType} "${displayName}" already exists (ID: ${entity.id}). No duplicate created.`,
  };
}

// Re-export prisma for convenience
export { prisma };
