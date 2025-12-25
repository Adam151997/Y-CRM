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

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; normalized?: string; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalized = email.toLowerCase().trim();

  if (!emailRegex.test(normalized)) {
    return { valid: false, error: `Invalid email format: "${email}". Expected format: name@domain.com` };
  }

  return { valid: true, normalized };
}

/**
 * Normalize phone number (remove formatting, keep digits and +)
 */
export function normalizePhone(phone: string): { valid: boolean; normalized?: string; error?: string } {
  // Remove all non-digit characters except +
  const normalized = phone.replace(/[^\d+]/g, "");

  // Must have at least 7 digits
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7) {
    return { valid: false, error: `Invalid phone number: "${phone}". Must have at least 7 digits.` };
  }

  if (digits.length > 15) {
    return { valid: false, error: `Invalid phone number: "${phone}". Too many digits.` };
  }

  return { valid: true, normalized };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { valid: boolean; normalized?: string; error?: string } {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: `Invalid URL: "${url}". Must use http or https.` };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, error: `Invalid URL format: "${url}". Expected format: https://example.com` };
  }
}

/**
 * Batch fetch entities by IDs to avoid N+1 queries
 */
export async function batchFetchByIds<T>(
  model: { findMany: (args: { where: { id: { in: string[] } } }) => Promise<T[]> },
  ids: string[]
): Promise<Map<string, T>> {
  if (ids.length === 0) return new Map();

  const uniqueIds = Array.from(new Set(ids));
  const results = await model.findMany({
    where: { id: { in: uniqueIds } },
  });

  return new Map((results as Array<T & { id: string }>).map(r => [r.id, r]));
}

/**
 * Process bulk operations with transaction support
 */
export async function processBulkOperation<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<{ success: boolean; id?: string; error?: string }>,
  options: { maxBatchSize?: number; stopOnError?: boolean } = {}
): Promise<{
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: Array<{ index: number; success: boolean; id?: string; error?: string }>;
}> {
  const { maxBatchSize = 50, stopOnError = false } = options;
  const results: Array<{ index: number; success: boolean; id?: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Limit batch size
  const processItems = items.slice(0, maxBatchSize);

  for (let i = 0; i < processItems.length; i++) {
    try {
      const result = await processor(processItems[i], i);
      results.push({ index: i, ...result });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (stopOnError) break;
      }
    } catch (error) {
      failureCount++;
      results.push({
        index: i,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      if (stopOnError) break;
    }
  }

  return {
    totalRequested: items.length,
    successCount,
    failureCount,
    results,
  };
}

/**
 * Find similar records for deduplication suggestions
 */
export async function findSimilarRecords(
  orgId: string,
  entityType: "lead" | "contact" | "account",
  searchFields: { name?: string; email?: string; company?: string }
): Promise<Array<{ id: string; name: string; email?: string; similarity: "exact" | "partial" }>> {
  const results: Array<{ id: string; name: string; email?: string; similarity: "exact" | "partial" }> = [];

  if (entityType === "lead") {
    // Search by email first (exact match)
    if (searchFields.email) {
      const emailMatch = await prisma.lead.findFirst({
        where: { orgId, email: searchFields.email.toLowerCase() },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (emailMatch) {
        results.push({
          id: emailMatch.id,
          name: `${emailMatch.firstName} ${emailMatch.lastName}`,
          email: emailMatch.email || undefined,
          similarity: "exact",
        });
      }
    }

    // Search by name (partial match)
    if (searchFields.name && results.length === 0) {
      const nameMatches = await prisma.lead.findMany({
        where: {
          orgId,
          OR: [
            { firstName: { contains: searchFields.name, mode: "insensitive" } },
            { lastName: { contains: searchFields.name, mode: "insensitive" } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true },
        take: 3,
      });

      nameMatches.forEach(m => {
        results.push({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email || undefined,
          similarity: "partial",
        });
      });
    }
  } else if (entityType === "contact") {
    if (searchFields.email) {
      const emailMatch = await prisma.contact.findFirst({
        where: { orgId, email: searchFields.email.toLowerCase() },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (emailMatch) {
        results.push({
          id: emailMatch.id,
          name: `${emailMatch.firstName} ${emailMatch.lastName}`,
          email: emailMatch.email || undefined,
          similarity: "exact",
        });
      }
    }
  } else if (entityType === "account") {
    if (searchFields.company) {
      const matches = await prisma.account.findMany({
        where: {
          orgId,
          name: { contains: searchFields.company, mode: "insensitive" },
        },
        select: { id: true, name: true },
        take: 3,
      });

      matches.forEach(m => {
        results.push({
          id: m.id,
          name: m.name,
          similarity: m.name.toLowerCase() === searchFields.company?.toLowerCase() ? "exact" : "partial",
        });
      });
    }
  }

  return results;
}

/**
 * Generate CSV content from records
 */
export function generateCSV(
  records: Record<string, unknown>[],
  columns: { key: string; header: string }[]
): string {
  if (records.length === 0) return "";

  // Header row
  const header = columns.map(c => `"${c.header}"`).join(",");

  // Data rows
  const rows = records.map(record => {
    return columns.map(col => {
      const value = record[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return `"${value.toISOString()}"`;
      return `"${String(value)}"`;
    }).join(",");
  });

  return [header, ...rows].join("\n");
}

// Re-export prisma for convenience
export { prisma };
