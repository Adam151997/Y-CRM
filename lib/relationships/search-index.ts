/**
 * Search Index Utilities
 * 
 * Fixes Issue #2: Query Performance at Scale
 * 
 * Strategies implemented:
 * 1. Cached search results for recent queries
 * 2. Batch record loading for list views
 * 3. Helper functions for creating searchable text
 * 4. Recommendations for PostgreSQL optimizations
 */

import prisma from "@/lib/db";

// In-memory search cache (simple LRU-style)
const searchCache = new Map<string, { results: unknown[]; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 100;

/**
 * Generate a cache key for search queries
 */
function generateCacheKey(
  orgId: string,
  moduleId: string,
  query: string,
  filters?: Record<string, unknown>
): string {
  return `${orgId}:${moduleId}:${query}:${JSON.stringify(filters || {})}`;
}

/**
 * Get cached search results if still valid
 */
function getCachedResults(key: string): unknown[] | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  searchCache.delete(key);
  return null;
}

/**
 * Cache search results
 */
function cacheResults(key: string, results: unknown[]): void {
  // Simple cache eviction if too large
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

/**
 * Clear search cache for a module (call after mutations)
 */
export function invalidateSearchCache(orgId: string, moduleId?: string): void {
  const keysToDelete: string[] = [];
  
  Array.from(searchCache.keys()).forEach((key) => {
    if (key.startsWith(orgId) && (!moduleId || key.includes(moduleId))) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => searchCache.delete(key));
}

/**
 * Extract searchable text from a record's data
 * Creates a concatenated string of all text fields for searching
 */
export function extractSearchableText(
  data: Record<string, unknown>,
  fieldDefinitions: Array<{
    fieldKey: string;
    fieldType: string;
    fieldName: string;
  }>
): string {
  const textParts: string[] = [];

  for (const field of fieldDefinitions) {
    const value = data[field.fieldKey];
    if (value === null || value === undefined) continue;

    // Only include text-like fields in search
    if (["TEXT", "TEXTAREA", "EMAIL", "PHONE", "URL", "SELECT"].includes(field.fieldType)) {
      textParts.push(String(value).toLowerCase());
    } else if (field.fieldType === "MULTISELECT" && Array.isArray(value)) {
      textParts.push(value.join(" ").toLowerCase());
    }
  }

  return textParts.join(" ");
}

/**
 * Optimized search for custom module records
 * Uses caching and efficient query patterns
 */
export async function searchCustomModuleRecords(
  orgId: string,
  moduleId: string,
  query: string,
  options: {
    labelField: string;
    limit?: number;
    offset?: number;
    filters?: Record<string, unknown>;
  }
): Promise<{ records: unknown[]; total: number; fromCache: boolean }> {
  const cacheKey = generateCacheKey(orgId, moduleId, query, options.filters);
  const cached = getCachedResults(cacheKey);
  
  if (cached) {
    // Apply pagination to cached results
    const start = options.offset || 0;
    const end = start + (options.limit || 20);
    return {
      records: cached.slice(start, end),
      total: cached.length,
      fromCache: true,
    };
  }

  // Build query conditions
  const whereConditions: any = {
    orgId,
    moduleId,
  };

  // Add filters
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null && value !== "") {
        whereConditions.data = {
          ...whereConditions.data,
          path: [key],
          equals: value,
        };
      }
    }
  }

  // For small datasets or no query, use simple fetch
  if (!query || query.trim() === "") {
    const [records, total] = await Promise.all([
      prisma.customModuleRecord.findMany({
        where: whereConditions,
        take: options.limit || 20,
        skip: options.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customModuleRecord.count({ where: whereConditions }),
    ]);

    return { records, total, fromCache: false };
  }

  // For queries, we need to search in JSON
  // This is the performance bottleneck - fetch all and filter
  // TODO: For production scale, implement PostgreSQL generated columns or external search
  
  const allRecords = await prisma.customModuleRecord.findMany({
    where: whereConditions,
    orderBy: { createdAt: "desc" },
  });

  // Filter by search query
  const searchLower = query.toLowerCase();
  const filteredRecords = allRecords.filter((record) => {
    const data = record.data as Record<string, unknown>;
    
    // Search in label field first (primary)
    const labelValue = data[options.labelField];
    if (labelValue && String(labelValue).toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in all string fields
    for (const value of Object.values(data)) {
      if (typeof value === "string" && value.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string" && item.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
      }
    }

    return false;
  });

  // Cache the filtered results
  cacheResults(cacheKey, filteredRecords);

  // Apply pagination
  const start = options.offset || 0;
  const end = start + (options.limit || 20);
  
  return {
    records: filteredRecords.slice(start, end),
    total: filteredRecords.length,
    fromCache: false,
  };
}

/**
 * Batch load records for relationship display
 * More efficient than individual queries
 */
export async function batchLoadRecords(
  orgId: string,
  requests: Array<{
    module: string;
    id: string;
  }>
): Promise<Map<string, unknown>> {
  const results = new Map<string, unknown>();
  
  // Group by module
  const byModule = new Map<string, string[]>();
  for (const req of requests) {
    const ids = byModule.get(req.module) || [];
    ids.push(req.id);
    byModule.set(req.module, ids);
  }

  // Fetch each module's records in batch
  const moduleEntries = Array.from(byModule.entries());
  for (let i = 0; i < moduleEntries.length; i++) {
    const [module, ids] = moduleEntries[i];
    try {
      const modelMap: Record<string, string> = {
        accounts: "account",
        contacts: "contact", 
        leads: "lead",
        opportunities: "opportunity",
      };

      const modelName = modelMap[module.toLowerCase()];
      
      if (modelName) {
        // Built-in module
        const records = await (prisma as any)[modelName].findMany({
          where: { id: { in: ids }, orgId },
        });
        
        for (const record of records) {
          results.set(`${module}:${record.id}`, record);
        }
      } else {
        // Custom module
        const customModule = await prisma.customModule.findFirst({
          where: { orgId, slug: module },
        });
        
        if (customModule) {
          const records = await prisma.customModuleRecord.findMany({
            where: { id: { in: ids }, orgId, moduleId: customModule.id },
          });
          
          for (const record of records) {
            results.set(`${module}:${record.id}`, record);
          }
        }
      }
    } catch (error) {
      console.error(`Error batch loading ${module}:`, error);
    }
  }

  return results;
}

/**
 * PostgreSQL Optimization Recommendations
 * 
 * For production at scale (10,000+ records), implement these:
 * 
 * 1. Generated Column for Label (run as migration):
 * ```sql
 * ALTER TABLE "CustomModuleRecord"
 * ADD COLUMN search_text TEXT GENERATED ALWAYS AS (
 *   LOWER(COALESCE(data->>'name', '') || ' ' || 
 *         COALESCE(data->>'title', '') || ' ' ||
 *         COALESCE(data->>'email', ''))
 * ) STORED;
 * 
 * CREATE INDEX idx_custom_record_search ON "CustomModuleRecord" 
 * USING gin(to_tsvector('english', search_text));
 * ```
 * 
 * 2. GIN Index on JSONB data:
 * ```sql
 * CREATE INDEX idx_custom_record_data ON "CustomModuleRecord" 
 * USING gin(data jsonb_path_ops);
 * ```
 * 
 * 3. Full-text search query:
 * ```sql
 * SELECT * FROM "CustomModuleRecord"
 * WHERE to_tsvector('english', search_text) @@ plainto_tsquery('english', $1)
 * AND "orgId" = $2 AND "moduleId" = $3;
 * ```
 */
export const OPTIMIZATION_SQL = {
  createSearchColumn: `
    ALTER TABLE "CustomModuleRecord"
    ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
      LOWER(COALESCE(data->>'name', '') || ' ' || 
            COALESCE(data->>'title', '') || ' ' ||
            COALESCE(data->>'description', '') || ' ' ||
            COALESCE(data->>'email', ''))
    ) STORED;
  `,
  createSearchIndex: `
    CREATE INDEX IF NOT EXISTS idx_custom_record_search 
    ON "CustomModuleRecord" USING gin(to_tsvector('english', COALESCE(search_text, '')));
  `,
  createDataIndex: `
    CREATE INDEX IF NOT EXISTS idx_custom_record_data 
    ON "CustomModuleRecord" USING gin(data jsonb_path_ops);
  `,
};

/**
 * Check if optimizations are applied
 */
export async function checkOptimizationsApplied(): Promise<{
  hasSearchColumn: boolean;
  hasSearchIndex: boolean;
  hasDataIndex: boolean;
}> {
  try {
    // Check for search_text column
    const columnCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'CustomModuleRecord' 
        AND column_name = 'search_text'
      ) as exists;
    `;

    // Check for indexes
    const indexCheck = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'CustomModuleRecord' 
      AND indexname IN ('idx_custom_record_search', 'idx_custom_record_data');
    `;

    const indexNames = indexCheck.map(i => i.indexname);

    return {
      hasSearchColumn: columnCheck[0]?.exists || false,
      hasSearchIndex: indexNames.includes('idx_custom_record_search'),
      hasDataIndex: indexNames.includes('idx_custom_record_data'),
    };
  } catch (error) {
    console.error("Error checking optimizations:", error);
    return {
      hasSearchColumn: false,
      hasSearchIndex: false,
      hasDataIndex: false,
    };
  }
}
