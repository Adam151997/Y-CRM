/**
 * Custom Module Tools
 *
 * Tools for creating and managing custom modules, fields, and records
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateCustomModuleCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError } from "../helpers";

/**
 * Create all custom module tools
 */
export function createCustomModuleTools(orgId: string, userId: string) {
  return {
    createCustomModule: createCustomModuleTool(orgId, userId),
    createCustomField: createCustomFieldTool(orgId, userId),
    createCustomModuleRecord: createCustomModuleRecordTool(orgId, userId),
    searchCustomModuleRecords: searchCustomModuleRecordsTool(orgId),
    listCustomModules: listCustomModulesTool(orgId),
  };
}

const createCustomModuleTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new custom module (e.g., Products, Projects, Events)",
    parameters: z.object({
      name: z.string().describe("Module name (singular, e.g., 'Product')"),
      pluralName: z.string().describe("Plural name (e.g., 'Products')"),
      description: z.string().optional(),
      icon: z.string().default("box").describe("Lucide icon name"),
    }),
    execute: async (params) => {
      logToolExecution("createCustomModule", params);
      try {
        const slug = params.pluralName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const existing = await prisma.customModule.findFirst({
          where: { orgId, slug },
        });
        if (existing) {
          return { success: false, message: `Module with slug "${slug}" already exists` };
        }

        const module = await prisma.customModule.create({
          data: {
            orgId,
            name: params.name,
            pluralName: params.pluralName,
            slug,
            description: params.description,
            icon: params.icon,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CUSTOM_MODULE",
          recordId: module.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: module as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateCustomModuleCaches();

        return {
          success: true,
          moduleId: module.id,
          slug: module.slug,
          message: `Created custom module "${module.name}" (ID: ${module.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createCustomModule");
      }
    },
  });

const createCustomFieldTool = (orgId: string, userId: string) =>
  tool({
    description: "Add a custom field to a module (built-in like LEAD, CONTACT, or custom module)",
    parameters: z.object({
      module: z.enum(["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"]).optional().describe("Built-in module"),
      customModuleId: z.string().uuid().optional().describe("Custom module ID"),
      fieldName: z.string().describe("Display name (e.g., 'Industry')"),
      fieldKey: z.string().describe("JSON key (e.g., 'industry')"),
      fieldType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "MULTISELECT", "BOOLEAN", "URL", "EMAIL", "PHONE", "TEXTAREA", "CURRENCY", "PERCENT"]),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional().describe("Options for SELECT/MULTISELECT"),
      placeholder: z.string().optional(),
    }),
    execute: async (params) => {
      logToolExecution("createCustomField", params);
      try {
        if (!params.module && !params.customModuleId) {
          return { success: false, message: "Must specify either module or customModuleId" };
        }

        if (params.customModuleId) {
          const customModule = await prisma.customModule.findFirst({
            where: { id: params.customModuleId, orgId },
          });
          if (!customModule) {
            return { success: false, message: "Custom module not found" };
          }
        }

        const field = await prisma.customFieldDefinition.create({
          data: {
            orgId,
            module: params.module,
            customModuleId: params.customModuleId,
            fieldName: params.fieldName,
            fieldKey: params.fieldKey,
            fieldType: params.fieldType,
            required: params.required,
            options: params.options,
            placeholder: params.placeholder,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CUSTOM_FIELD",
          recordId: field.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: field as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateCustomModuleCaches();

        return {
          success: true,
          fieldId: field.id,
          message: `Created custom field "${field.fieldName}" (${field.fieldType})`,
        };
      } catch (error) {
        return handleToolError(error, "createCustomField");
      }
    },
  });

const createCustomModuleRecordTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a record in a custom module",
    parameters: z.object({
      moduleId: z.string().uuid().describe("Custom module ID"),
      data: z.record(z.unknown()).describe("Record data as key-value pairs"),
    }),
    execute: async ({ moduleId, data }) => {
      logToolExecution("createCustomModuleRecord", { moduleId, data });
      try {
        const module = await prisma.customModule.findFirst({
          where: { id: moduleId, orgId },
        });
        if (!module) {
          return { success: false, message: "Custom module not found" };
        }

        const record = await prisma.customModuleRecord.create({
          data: {
            orgId,
            moduleId,
            data: data as unknown as import("@prisma/client").Prisma.InputJsonValue,
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        return {
          success: true,
          recordId: record.id,
          moduleName: module.name,
          message: `Created ${module.name} record (ID: ${record.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createCustomModuleRecord");
      }
    },
  });

const searchCustomModuleRecordsTool = (orgId: string) =>
  tool({
    description: "Search records in a custom module",
    parameters: z.object({
      moduleId: z.string().uuid().describe("Custom module ID"),
      limit: z.number().min(1).max(50).default(10),
    }),
    execute: async ({ moduleId, limit }) => {
      logToolExecution("searchCustomModuleRecords", { moduleId, limit });
      try {
        const module = await prisma.customModule.findFirst({
          where: { id: moduleId, orgId },
        });
        if (!module) {
          return { success: false, message: "Custom module not found" };
        }

        const records = await prisma.customModuleRecord.findMany({
          where: { moduleId, orgId },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        return {
          success: true,
          moduleName: module.name,
          count: records.length,
          records: records.map((r) => ({
            id: r.id,
            data: r.data,
            createdAt: r.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchCustomModuleRecords"), count: 0, records: [] };
      }
    },
  });

const listCustomModulesTool = (orgId: string) =>
  tool({
    description: "List all custom modules available in the system",
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("listCustomModules", {});
      try {
        const modules = await prisma.customModule.findMany({
          where: { orgId, isActive: true },
          orderBy: { displayOrder: "asc" },
          include: {
            _count: { select: { records: true, fields: true } },
          },
        });

        return {
          success: true,
          count: modules.length,
          modules: modules.map((m) => ({
            id: m.id,
            name: m.name,
            pluralName: m.pluralName,
            slug: m.slug,
            icon: m.icon,
            recordCount: m._count.records,
            fieldCount: m._count.fields,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "listCustomModules"), count: 0, modules: [] };
      }
    },
  });
