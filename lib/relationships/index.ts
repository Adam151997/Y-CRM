/**
 * Relationship Management System
 * 
 * Handles:
 * 1. Referential integrity on delete (cleanup orphaned relationships)
 * 2. Relationship validation (verify IDs exist)
 * 3. Relationship traversal (multi-level queries)
 */

import prisma from "@/lib/db";

// Built-in modules that can be relationship targets
export const BUILT_IN_MODULES = ["accounts", "contacts", "leads", "opportunities"] as const;
export type BuiltInModule = typeof BUILT_IN_MODULES[number];

// Module to Prisma model mapping
const MODULE_TO_MODEL: Record<string, string> = {
  accounts: "account",
  contacts: "contact",
  leads: "lead",
  opportunities: "opportunity",
  ACCOUNT: "account",
  CONTACT: "contact",
  LEAD: "lead",
  OPPORTUNITY: "opportunity",
};

/**
 * Check if a module is built-in or custom
 */
export function isBuiltInModule(module: string): boolean {
  const normalized = module.toLowerCase();
  return BUILT_IN_MODULES.includes(normalized as BuiltInModule) ||
    ["account", "contact", "lead", "opportunity"].includes(normalized);
}

/**
 * Validate that a relationship target exists
 * Fixes Issue #4: No Relationship Validation
 */
export async function validateRelationshipTarget(
  relatedModule: string,
  targetId: string,
  orgId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!targetId || targetId === "" || targetId === "null") {
    return { valid: true }; // Empty relationships are valid (optional)
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(targetId)) {
    return { valid: false, error: `Invalid ID format: ${targetId}` };
  }

  try {
    if (isBuiltInModule(relatedModule)) {
      // Check built-in module
      const modelName = MODULE_TO_MODEL[relatedModule] || MODULE_TO_MODEL[relatedModule.toUpperCase()];
      if (!modelName) {
        return { valid: false, error: `Unknown module: ${relatedModule}` };
      }

      // Dynamic Prisma query
      const record = await (prisma as any)[modelName].findFirst({
        where: { id: targetId, orgId },
        select: { id: true },
      });

      if (!record) {
        return { valid: false, error: `${relatedModule} record not found: ${targetId}` };
      }
    } else {
      // Check custom module by slug
      const customModule = await prisma.customModule.findFirst({
        where: { orgId, slug: relatedModule },
        select: { id: true },
      });

      if (!customModule) {
        return { valid: false, error: `Custom module not found: ${relatedModule}` };
      }

      const record = await prisma.customModuleRecord.findFirst({
        where: { id: targetId, orgId, moduleId: customModule.id },
        select: { id: true },
      });

      if (!record) {
        return { valid: false, error: `Custom module record not found: ${targetId}` };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating relationship:", error);
    return { valid: false, error: "Failed to validate relationship" };
  }
}

/**
 * Validate multiple relationship fields in a record
 */
export async function validateRelationships(
  orgId: string,
  fieldDefinitions: Array<{
    fieldKey: string;
    fieldType: string;
    relatedModule: string | null;
  }>,
  data: Record<string, unknown>
): Promise<{ valid: boolean; errors: Record<string, string> }> {
  const errors: Record<string, string> = {};

  for (const field of fieldDefinitions) {
    if (field.fieldType !== "RELATIONSHIP" || !field.relatedModule) {
      continue;
    }

    const value = data[field.fieldKey];
    if (!value || value === "" || value === null) {
      continue; // Skip empty values
    }

    const result = await validateRelationshipTarget(
      field.relatedModule,
      String(value),
      orgId
    );

    if (!result.valid) {
      errors[field.fieldKey] = result.error || "Invalid relationship";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Find all field definitions that reference a specific module
 */
export async function findFieldsReferencingModule(
  orgId: string,
  targetModule: string
): Promise<Array<{
  id: string;
  fieldKey: string;
  module: string | null;
  customModuleId: string | null;
}>> {
  return prisma.customFieldDefinition.findMany({
    where: {
      orgId,
      fieldType: "RELATIONSHIP",
      relatedModule: targetModule,
      isActive: true,
    },
    select: {
      id: true,
      fieldKey: true,
      module: true,
      customModuleId: true,
    },
  });
}

/**
 * Clean up orphaned relationships when a record is deleted
 * Fixes Issue #1: No Referential Integrity
 * 
 * Strategy: Set orphaned relationship fields to null
 */
export async function cleanupOrphanedRelationships(
  orgId: string,
  deletedModule: string,
  deletedId: string
): Promise<{ cleaned: number; errors: string[] }> {
  const errors: string[] = [];
  let cleaned = 0;

  try {
    // Find all fields that reference this module
    const referencingFields = await findFieldsReferencingModule(orgId, deletedModule);

    for (const field of referencingFields) {
      try {
        if (field.module) {
          // Built-in module - update customFields JSON
          const modelName = MODULE_TO_MODEL[field.module];
          if (modelName) {
            // Find records with this relationship
            const records = await (prisma as any)[modelName].findMany({
              where: {
                orgId,
                customFields: {
                  path: [field.fieldKey],
                  equals: deletedId,
                },
              },
              select: { id: true, customFields: true },
            });

            // Update each record to null out the relationship
            for (const record of records) {
              const customFields = (record.customFields as Record<string, unknown>) || {};
              customFields[field.fieldKey] = null;

              await (prisma as any)[modelName].update({
                where: { id: record.id },
                data: { customFields },
              });
              cleaned++;
            }
          }
        } else if (field.customModuleId) {
          // Custom module - update data JSON
          const records = await prisma.customModuleRecord.findMany({
            where: {
              orgId,
              moduleId: field.customModuleId,
              data: {
                path: [field.fieldKey],
                equals: deletedId,
              },
            },
            select: { id: true, data: true },
          });

          for (const record of records) {
            const data = (record.data as Record<string, unknown>) || {};
            data[field.fieldKey] = null;

            await prisma.customModuleRecord.update({
              where: { id: record.id },
              data: { data },
            });
            cleaned++;
          }
        }
      } catch (fieldError) {
        errors.push(`Failed to clean field ${field.fieldKey}: ${fieldError}`);
      }
    }

    return { cleaned, errors };
  } catch (error) {
    console.error("Error cleaning up relationships:", error);
    return { cleaned, errors: [`Fatal error: ${error}`] };
  }
}

/**
 * Get related records for a given record (1-level deep)
 */
export async function getRelatedRecords(
  orgId: string,
  sourceModule: string,
  sourceId: string,
  relationshipField: string,
  targetModule: string
): Promise<{ records: unknown[]; error?: string }> {
  try {
    // Get the source record's relationship value
    let relationshipValue: string | null = null;

    if (isBuiltInModule(sourceModule)) {
      const modelName = MODULE_TO_MODEL[sourceModule];
      const record = await (prisma as any)[modelName].findFirst({
        where: { id: sourceId, orgId },
        select: { customFields: true },
      });
      
      if (record?.customFields) {
        relationshipValue = (record.customFields as Record<string, unknown>)[relationshipField] as string;
      }
    } else {
      const customModule = await prisma.customModule.findFirst({
        where: { orgId, slug: sourceModule },
      });
      
      if (customModule) {
        const record = await prisma.customModuleRecord.findFirst({
          where: { id: sourceId, orgId, moduleId: customModule.id },
          select: { data: true },
        });
        
        if (record?.data) {
          relationshipValue = (record.data as Record<string, unknown>)[relationshipField] as string;
        }
      }
    }

    if (!relationshipValue) {
      return { records: [] };
    }

    // Fetch the target record
    if (isBuiltInModule(targetModule)) {
      const modelName = MODULE_TO_MODEL[targetModule];
      const targetRecord = await (prisma as any)[modelName].findFirst({
        where: { id: relationshipValue, orgId },
      });
      return { records: targetRecord ? [targetRecord] : [] };
    } else {
      const customModule = await prisma.customModule.findFirst({
        where: { orgId, slug: targetModule },
      });
      
      if (customModule) {
        const targetRecord = await prisma.customModuleRecord.findFirst({
          where: { id: relationshipValue, orgId, moduleId: customModule.id },
        });
        return { records: targetRecord ? [targetRecord] : [] };
      }
    }

    return { records: [] };
  } catch (error) {
    console.error("Error getting related records:", error);
    return { records: [], error: String(error) };
  }
}

/**
 * Resolve a relationship path (multi-level traversal)
 * Fixes Issue #3: Relationship Depth Limitation
 * 
 * Example: resolveRelationshipPath(orgId, "accounts", accountId, ["products", "warranties"])
 * Returns all warranties linked to products linked to the account
 */
export async function resolveRelationshipPath(
  orgId: string,
  startModule: string,
  startId: string,
  path: Array<{ field: string; targetModule: string }>
): Promise<{ records: unknown[]; error?: string }> {
  if (path.length === 0) {
    return { records: [] };
  }

  try {
    let currentIds = [startId];
    let currentModule = startModule;

    for (const step of path) {
      const nextIds: string[] = [];

      for (const id of currentIds) {
        const result = await getRelatedRecords(
          orgId,
          currentModule,
          id,
          step.field,
          step.targetModule
        );

        for (const record of result.records) {
          const recordId = (record as { id: string }).id;
          if (recordId && !nextIds.includes(recordId)) {
            nextIds.push(recordId);
          }
        }
      }

      currentIds = nextIds;
      currentModule = step.targetModule;

      if (currentIds.length === 0) {
        break; // No more records to traverse
      }
    }

    // Fetch final records
    if (currentIds.length === 0) {
      return { records: [] };
    }

    const finalModule = path[path.length - 1].targetModule;
    
    if (isBuiltInModule(finalModule)) {
      const modelName = MODULE_TO_MODEL[finalModule];
      const records = await (prisma as any)[modelName].findMany({
        where: { id: { in: currentIds }, orgId },
      });
      return { records };
    } else {
      const customModule = await prisma.customModule.findFirst({
        where: { orgId, slug: finalModule },
      });
      
      if (customModule) {
        const records = await prisma.customModuleRecord.findMany({
          where: { id: { in: currentIds }, orgId, moduleId: customModule.id },
        });
        return { records };
      }
    }

    return { records: [] };
  } catch (error) {
    console.error("Error resolving relationship path:", error);
    return { records: [], error: String(error) };
  }
}

/**
 * Get all records that reference a specific record (reverse lookup)
 */
export async function getReferencingRecords(
  orgId: string,
  targetModule: string,
  targetId: string
): Promise<Array<{
  module: string;
  recordId: string;
  fieldKey: string;
}>> {
  const results: Array<{ module: string; recordId: string; fieldKey: string }> = [];

  try {
    // Find all fields that reference this module
    const referencingFields = await findFieldsReferencingModule(orgId, targetModule);

    for (const field of referencingFields) {
      if (field.module) {
        // Built-in module
        const modelName = MODULE_TO_MODEL[field.module];
        if (modelName) {
          const records = await (prisma as any)[modelName].findMany({
            where: {
              orgId,
              customFields: {
                path: [field.fieldKey],
                equals: targetId,
              },
            },
            select: { id: true },
          });

          for (const record of records) {
            results.push({
              module: field.module,
              recordId: record.id,
              fieldKey: field.fieldKey,
            });
          }
        }
      } else if (field.customModuleId) {
        // Custom module
        const records = await prisma.customModuleRecord.findMany({
          where: {
            orgId,
            moduleId: field.customModuleId,
            data: {
              path: [field.fieldKey],
              equals: targetId,
            },
          },
          select: { id: true },
        });

        const customModule = await prisma.customModule.findFirst({
          where: { id: field.customModuleId },
          select: { slug: true },
        });

        for (const record of records) {
          results.push({
            module: customModule?.slug || field.customModuleId,
            recordId: record.id,
            fieldKey: field.fieldKey,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error getting referencing records:", error);
    return results;
  }
}
