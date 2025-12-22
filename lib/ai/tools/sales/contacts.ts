/**
 * Contact Tools for Sales Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateContactCaches } from "@/lib/cache-utils";
import { resolveUser } from "@/lib/user-resolver";
import { logToolExecution, handleToolError } from "../helpers";

export function createContactTools(orgId: string, userId: string) {
  return {
    createContact: createContactTool(orgId, userId),
    searchContacts: searchContactsTool(orgId),
  };
}

const createContactTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new contact in the CRM. Can optionally assign to a team member.",
    parameters: z.object({
      firstName: z.string().describe("Contact's first name (required)"),
      lastName: z.string().describe("Contact's last name (required)"),
      email: z.string().optional().describe("Contact's email"),
      phone: z.string().optional().describe("Contact's phone"),
      title: z.string().optional().describe("Job title"),
      department: z.string().optional().describe("Department"),
      accountId: z.string().optional().describe("Associated account ID (UUID)"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
    }),
    execute: async (params) => {
      logToolExecution("createContact", params);
      try {
        // Check for duplicate contact created in last 60 seconds
        const recentDuplicate = await prisma.contact.findFirst({
          where: {
            orgId,
            firstName: { equals: params.firstName, mode: "insensitive" },
            lastName: { equals: params.lastName, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createContact] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            contactId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Contact "${recentDuplicate.firstName} ${recentDuplicate.lastName}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        if (params.accountId) {
          const account = await prisma.account.findFirst({
            where: { id: params.accountId, orgId },
          });
          if (!account) {
            return { success: false, message: "Account not found" };
          }
        }

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
          }
        }

        const { assignTo, ...contactData } = params;
        const contact = await prisma.contact.create({
          data: { orgId, ...contactData, assignedToId },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CONTACT",
          recordId: contact.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: contact as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateContactCaches();

        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          contactId: contact.id,
          assignedToId,
          assignedToName,
          message: `Created contact "${contact.firstName} ${contact.lastName}" (ID: ${contact.id}).${assignmentMsg}`,
        };
      } catch (error) {
        return handleToolError(error, "createContact");
      }
    },
  });

const searchContactsTool = (orgId: string) =>
  tool({
    description: "Search for contacts",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      accountId: z.string().optional().describe("Filter by account ID (UUID)"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, accountId, limit = 5 }) => {
      logToolExecution("searchContacts", { query, accountId, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (accountId) where.accountId = accountId;
        if (query) {
          where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ];
        }

        const contacts = await prisma.contact.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { account: { select: { name: true } } },
        });

        return {
          success: true,
          count: contacts.length,
          contacts: contacts.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            title: c.title,
            account: c.account?.name,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchContacts"), count: 0, contacts: [] };
      }
    },
  });
