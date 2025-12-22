/**
 * Ticket Tools for Customer Success Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateTicketCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError } from "../helpers";

export function createTicketTools(orgId: string, userId: string) {
  return {
    createTicket: createTicketTool(orgId, userId),
    searchTickets: searchTicketsTool(orgId),
    updateTicket: updateTicketTool(orgId, userId),
    addTicketMessage: addTicketMessageTool(orgId, userId),
  };
}

const createTicketTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new support ticket in the Customer Success workspace. You can provide either accountId (UUID) or accountName (the tool will search for the account).",
    parameters: z.object({
      subject: z.string().describe("Ticket subject (required)"),
      description: z.string().optional().describe("Ticket description"),
      accountId: z.string().optional().describe("Account ID (UUID) - use if you already have it"),
      accountName: z.string().optional().describe("Account name to search for - use if you don't have the accountId"),
      contactId: z.string().optional().describe("Contact ID (UUID)"),
      priority: z.string().optional().describe("Priority: LOW, MEDIUM (default), HIGH, or URGENT"),
      category: z.string().optional().describe("Category: BUG, BILLING, FEATURE_REQUEST, QUESTION, or GENERAL"),
    }),
    execute: async (params) => {
      logToolExecution("createTicket", params);
      try {
        // Resolve accountId from accountName if needed
        let resolvedAccountId = params.accountId;

        if (!resolvedAccountId && params.accountName) {
          const account = await prisma.account.findFirst({
            where: {
              orgId,
              name: { contains: params.accountName, mode: "insensitive" },
            },
          });
          if (account) {
            resolvedAccountId = account.id;
            console.log("[Tool:createTicket] Resolved account:", account.name, "->", account.id);
          } else {
            return {
              success: false,
              errorCode: "NOT_FOUND",
              message: `Account "${params.accountName}" not found. Please create the account first or check the spelling.`,
            };
          }
        }

        if (!resolvedAccountId) {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: "Either accountId or accountName is required to create a ticket.",
          };
        }

        // Check for duplicate ticket created in last 60 seconds
        const recentDuplicate = await prisma.ticket.findFirst({
          where: {
            orgId,
            subject: { equals: params.subject, mode: "insensitive" },
            accountId: resolvedAccountId,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createTicket] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            ticketId: recentDuplicate.id,
            ticketNumber: recentDuplicate.ticketNumber,
            alreadyExisted: true,
            message: `Ticket #${recentDuplicate.ticketNumber}: "${recentDuplicate.subject}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Verify account exists
        const account = await prisma.account.findFirst({
          where: { id: resolvedAccountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found" };
        }

        const ticket = await prisma.ticket.create({
          data: {
            orgId,
            subject: params.subject,
            description: params.description,
            accountId: resolvedAccountId,
            contactId: params.contactId,
            priority: (params.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
            category: params.category as "BUG" | "BILLING" | "FEATURE_REQUEST" | "QUESTION" | "GENERAL" | undefined,
            status: "NEW",
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "TICKET",
          recordId: ticket.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: ticket as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateTicketCaches();

        return {
          success: true,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          message: `Created ticket #${ticket.ticketNumber}: "${ticket.subject}" for ${account.name} (ID: ${ticket.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createTicket");
      }
    },
  });

const searchTicketsTool = (orgId: string) =>
  tool({
    description: "Search for support tickets",
    parameters: z.object({
      query: z.string().optional().describe("Search term for subject"),
      status: z.string().optional().describe("Filter by status: NEW, OPEN, PENDING, RESOLVED, or CLOSED"),
      priority: z.string().optional().describe("Filter by priority: LOW, MEDIUM, HIGH, or URGENT"),
      accountId: z.string().optional().describe("Filter by account ID (UUID)"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, status, priority, accountId, limit = 10 }) => {
      logToolExecution("searchTickets", { query, status, priority, accountId, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (accountId) where.accountId = accountId;
        if (query) {
          where.subject = { contains: query, mode: "insensitive" };
        }

        const tickets = await prisma.ticket.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            account: { select: { name: true } },
          },
        });

        return {
          success: true,
          count: tickets.length,
          tickets: tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            account: t.account.name,
            createdAt: t.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchTickets"), count: 0, tickets: [] };
      }
    },
  });

const updateTicketTool = (orgId: string, userId: string) =>
  tool({
    description: "Update a ticket's status, priority, or assignment",
    parameters: z.object({
      ticketId: z.string().describe("Ticket ID (UUID) to update"),
      status: z.string().optional().describe("New status: NEW, OPEN, PENDING, RESOLVED, or CLOSED"),
      priority: z.string().optional().describe("New priority: LOW, MEDIUM, HIGH, or URGENT"),
      assignedToId: z.string().optional().describe("Assign to user ID"),
      resolution: z.string().optional().describe("Resolution notes (for resolved/closed)"),
    }),
    execute: async ({ ticketId, ...updates }) => {
      logToolExecution("updateTicket", { ticketId, ...updates });
      try {
        const existing = await prisma.ticket.findFirst({
          where: { id: ticketId, orgId },
        });
        if (!existing) {
          return { success: false, message: "Ticket not found" };
        }

        const updateData: Record<string, unknown> = { ...updates };
        if (updates.status === "RESOLVED" || updates.status === "CLOSED") {
          updateData.resolvedAt = new Date();
          updateData.resolvedById = userId;
        }

        const ticket = await prisma.ticket.update({
          where: { id: ticketId },
          data: updateData,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "TICKET",
          recordId: ticket.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: ticket as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateTicketCaches();

        return {
          success: true,
          message: `Updated ticket #${ticket.ticketNumber}`,
        };
      } catch (error) {
        return handleToolError(error, "updateTicket");
      }
    },
  });

const addTicketMessageTool = (orgId: string, userId: string) =>
  tool({
    description: "Add a message or reply to a ticket",
    parameters: z.object({
      ticketId: z.string().describe("Ticket ID (UUID)"),
      content: z.string().describe("Message content"),
      isInternal: z.boolean().optional().describe("Internal note not visible to customer (default: false)"),
    }),
    execute: async ({ ticketId, content, isInternal = false }) => {
      logToolExecution("addTicketMessage", { ticketId, isInternal });
      try {
        const ticket = await prisma.ticket.findFirst({
          where: { id: ticketId, orgId },
        });
        if (!ticket) {
          return { success: false, message: "Ticket not found" };
        }

        const message = await prisma.ticketMessage.create({
          data: {
            ticketId,
            content,
            isInternal,
            authorId: userId,
            authorType: "AI_AGENT",
            authorName: "AI Assistant",
          },
        });

        // Update ticket status if it's NEW
        if (ticket.status === "NEW") {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "OPEN" },
          });
        }

        revalidateTicketCaches();

        return {
          success: true,
          messageId: message.id,
          message: `Added ${isInternal ? "internal note" : "reply"} to ticket #${ticket.ticketNumber}`,
        };
      } catch (error) {
        return handleToolError(error, "addTicketMessage");
      }
    },
  });
