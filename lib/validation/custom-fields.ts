import { z } from "zod";
import prisma from "../db";

type CustomFieldModule = "LEAD" | "CONTACT" | "ACCOUNT" | "OPPORTUNITY";

interface FieldDefinition {
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options?: string[] | null;
}

// Cache field definitions per org to avoid repeated DB queries
const fieldDefCache = new Map<string, FieldDefinition[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

export async function getCustomFieldDefinitions(
  orgId: string,
  module: CustomFieldModule
): Promise<FieldDefinition[]> {
  const cacheKey = `${orgId}:${module}`;
  const now = Date.now();
  const cachedTimestamp = cacheTimestamps.get(cacheKey);

  // Return cached if valid
  if (
    cachedTimestamp &&
    now - cachedTimestamp < CACHE_TTL &&
    fieldDefCache.has(cacheKey)
  ) {
    return fieldDefCache.get(cacheKey)!;
  }

  // Fetch from database
  const definitions = await prisma.customFieldDefinition.findMany({
    where: { orgId, module, isActive: true },
    select: {
      fieldKey: true,
      fieldType: true,
      required: true,
      options: true,
    },
  });

  // Transform and cache
  const transformed = definitions.map((def) => ({
    fieldKey: def.fieldKey,
    fieldType: def.fieldType,
    required: def.required,
    options: def.options as string[] | null,
  }));

  fieldDefCache.set(cacheKey, transformed);
  cacheTimestamps.set(cacheKey, now);

  return transformed;
}

export async function getCustomFieldSchema(
  orgId: string,
  module: CustomFieldModule
): Promise<z.ZodObject<Record<string, z.ZodTypeAny>>> {
  const definitions = await getCustomFieldDefinitions(orgId, module);

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const def of definitions) {
    let fieldSchema: z.ZodTypeAny;

    switch (def.fieldType) {
      case "TEXT":
        fieldSchema = z.string().max(1000);
        break;
      case "NUMBER":
        fieldSchema = z.number();
        break;
      case "DATE":
        fieldSchema = z.coerce.date();
        break;
      case "BOOLEAN":
        fieldSchema = z.boolean();
        break;
      case "SELECT":
        if (def.options && def.options.length > 0) {
          fieldSchema = z.enum(def.options as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case "MULTISELECT":
        if (def.options && def.options.length > 0) {
          fieldSchema = z.array(z.enum(def.options as [string, ...string[]]));
        } else {
          fieldSchema = z.array(z.string());
        }
        break;
      case "URL":
        fieldSchema = z.string().url();
        break;
      case "EMAIL":
        fieldSchema = z.string().email();
        break;
      case "PHONE":
        fieldSchema = z.string().max(30);
        break;
      default:
        fieldSchema = z.unknown();
    }

    if (!def.required) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    shape[def.fieldKey] = fieldSchema;
  }

  return z.object(shape).passthrough();
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError };

export async function validateCustomFields(
  orgId: string,
  module: CustomFieldModule,
  data: unknown
): Promise<ValidationResult<Record<string, unknown>>> {
  const schema = await getCustomFieldSchema(orgId, module);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// Invalidate cache when definitions change
export function invalidateCustomFieldCache(orgId: string, module?: CustomFieldModule) {
  if (module) {
    const cacheKey = `${orgId}:${module}`;
    fieldDefCache.delete(cacheKey);
    cacheTimestamps.delete(cacheKey);
  } else {
    // Invalidate all for this org
    const modules: CustomFieldModule[] = ["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"];
    for (const m of modules) {
      const cacheKey = `${orgId}:${m}`;
      fieldDefCache.delete(cacheKey);
      cacheTimestamps.delete(cacheKey);
    }
  }
}

// Get all custom fields for a module with full definitions
export async function getCustomFieldsWithDefinitions(
  orgId: string,
  module: CustomFieldModule
) {
  return prisma.customFieldDefinition.findMany({
    where: { orgId, module, isActive: true },
    orderBy: { displayOrder: "asc" },
  });
}
