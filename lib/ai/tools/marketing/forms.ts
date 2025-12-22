/**
 * Form Tools for Marketing Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateFormCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError } from "../helpers";

export function createFormTools(orgId: string, userId: string) {
  return {
    createForm: createFormTool(orgId, userId),
    searchForms: searchFormsTool(orgId),
  };
}

const createFormTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new lead capture form. Default fields are Name and Email. Use fieldsJson to customize.",
    parameters: z.object({
      name: z.string().describe("Form name (required)"),
      description: z.string().optional(),
      fieldsJson: z.string().optional().describe("JSON string of fields array, e.g. [{\"type\":\"text\",\"label\":\"Name\",\"required\":true},{\"type\":\"email\",\"label\":\"Email\",\"required\":true}]. Types: text, email, phone, textarea, select, checkbox, number, date"),
      createLead: z.boolean().optional().describe("Automatically create lead from submissions (default: true)"),
    }),
    execute: async (params) => {
      logToolExecution("createForm", params);
      try {
        // Check for duplicate form created in last 60 seconds
        const recentDuplicate = await prisma.form.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createForm] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            formId: recentDuplicate.id,
            slug: recentDuplicate.slug,
            alreadyExisted: true,
            message: `Form "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Generate slug from name
        const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // Check slug uniqueness
        const existing = await prisma.form.findFirst({
          where: { orgId, slug },
        });

        const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

        // Parse fields from JSON string if provided, otherwise use defaults
        let fields: { type: string; label: string; required?: boolean; placeholder?: string }[] = [
          { type: "text", label: "Full Name", required: true },
          { type: "email", label: "Email", required: true },
        ];
        if (params.fieldsJson) {
          try {
            fields = JSON.parse(params.fieldsJson);
          } catch {
            return { success: false, message: "Invalid fieldsJson format. Expected JSON array." };
          }
        }

        const form = await prisma.form.create({
          data: {
            orgId,
            name: params.name,
            description: params.description,
            fields: fields.map((f, i) => ({ id: `field-${i}`, ...f })),
            createLead: params.createLead ?? true,
            slug: finalSlug,
            isActive: true,
            createdById: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "FORM",
          recordId: form.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: form as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateFormCaches();

        return {
          success: true,
          formId: form.id,
          slug: form.slug,
          message: `Created form "${form.name}" (ID: ${form.id}, slug: ${form.slug})`,
        };
      } catch (error) {
        return handleToolError(error, "createForm");
      }
    },
  });

const searchFormsTool = (orgId: string) =>
  tool({
    description: "Search for lead capture forms",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      isActive: z.boolean().optional().describe("Filter by active status"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, isActive, limit = 10 }) => {
      logToolExecution("searchForms", { query, isActive, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (isActive !== undefined) where.isActive = isActive;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }

        const forms = await prisma.form.findMany({
          where,
          take: limit,
          orderBy: { submissions: "desc" },
        });

        return {
          success: true,
          count: forms.length,
          forms: forms.map((f) => ({
            id: f.id,
            name: f.name,
            slug: f.slug,
            views: f.views,
            submissions: f.submissions,
            conversionRate: f.conversionRate ? Number(f.conversionRate) : null,
            isActive: f.isActive,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchForms"), count: 0, forms: [] };
      }
    },
  });
