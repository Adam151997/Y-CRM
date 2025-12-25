/**
 * Data Export Tools
 * Export CRM data to CSV format
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError, generateCSV } from "../helpers";

export function createExportTools(orgId: string) {
  return {
    exportLeads: exportLeadsTool(orgId),
    exportContacts: exportContactsTool(orgId),
    exportAccounts: exportAccountsTool(orgId),
    exportOpportunities: exportOpportunitiesTool(orgId),
    exportTickets: exportTicketsTool(orgId),
  };
}

const exportLeadsTool = (orgId: string) =>
  tool({
    description: `Export leads to CSV format.

Example: Export all qualified leads
- status: "QUALIFIED"
- columns: ["firstName", "lastName", "email", "company", "status"]`,
    parameters: z.object({
      status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]).optional()
        .describe("Filter by status"),
      source: z.enum(["REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN", "TRADE_SHOW", "ADVERTISEMENT", "EMAIL_CAMPAIGN", "OTHER"]).optional()
        .describe("Filter by source"),
      columns: z.array(z.enum([
        "firstName", "lastName", "email", "phone", "company", "title",
        "status", "source", "createdAt", "assignedTo"
      ])).optional().describe("Columns to include (default: all)"),
      limit: z.number().min(1).max(1000).default(100).describe("Maximum records (1-1000)"),
    }),
    execute: async ({ status, source, columns, limit }) => {
      logToolExecution("exportLeads", { status, source, columns, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (source) where.source = source;

        const leads = await prisma.lead.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { assignedTo: { select: { name: true } } },
        });

        const allColumns = [
          { key: "firstName", header: "First Name" },
          { key: "lastName", header: "Last Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          { key: "company", header: "Company" },
          { key: "title", header: "Title" },
          { key: "status", header: "Status" },
          { key: "source", header: "Source" },
          { key: "createdAt", header: "Created At" },
          { key: "assignedToName", header: "Assigned To" },
        ];

        const selectedColumns = columns
          ? allColumns.filter(c => columns.includes(c.key as typeof columns[number]) || c.key === "assignedToName" && columns.includes("assignedTo"))
          : allColumns;

        const records = leads.map(l => ({
          ...l,
          assignedToName: l.assignedTo?.name || "",
        }));

        const csv = generateCSV(records as Record<string, unknown>[], selectedColumns);

        return {
          success: true,
          count: leads.length,
          csv,
          message: `Exported ${leads.length} leads to CSV format.`,
        };
      } catch (error) {
        return handleToolError(error, "exportLeads");
      }
    },
  });

const exportContactsTool = (orgId: string) =>
  tool({
    description: `Export contacts to CSV format.

Example: Export contacts for a specific account
- accountId: "account-uuid"`,
    parameters: z.object({
      accountId: z.string().uuid().optional().describe("Filter by account"),
      columns: z.array(z.enum([
        "firstName", "lastName", "email", "phone", "title",
        "accountName", "createdAt"
      ])).optional().describe("Columns to include (default: all)"),
      limit: z.number().min(1).max(1000).default(100).describe("Maximum records (1-1000)"),
    }),
    execute: async ({ accountId, columns, limit }) => {
      logToolExecution("exportContacts", { accountId, columns, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (accountId) where.accountId = accountId;

        const contacts = await prisma.contact.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { account: { select: { name: true } } },
        });

        const allColumns = [
          { key: "firstName", header: "First Name" },
          { key: "lastName", header: "Last Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          { key: "title", header: "Title" },
          { key: "accountName", header: "Account" },
          { key: "createdAt", header: "Created At" },
        ];

        const selectedColumns = columns
          ? allColumns.filter(c => columns.includes(c.key as typeof columns[number]) || c.key === "accountName")
          : allColumns;

        const records = contacts.map(c => ({
          ...c,
          accountName: c.account?.name || "",
        }));

        const csv = generateCSV(records as Record<string, unknown>[], selectedColumns);

        return {
          success: true,
          count: contacts.length,
          csv,
          message: `Exported ${contacts.length} contacts to CSV format.`,
        };
      } catch (error) {
        return handleToolError(error, "exportContacts");
      }
    },
  });

const exportAccountsTool = (orgId: string) =>
  tool({
    description: `Export accounts to CSV format.

Example: Export all customer accounts
- type: "CUSTOMER"`,
    parameters: z.object({
      type: z.enum(["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"]).optional()
        .describe("Filter by account type"),
      rating: z.enum(["HOT", "WARM", "COLD"]).optional()
        .describe("Filter by rating"),
      columns: z.array(z.enum([
        "name", "website", "phone", "industry", "type",
        "rating", "employees", "revenue", "createdAt"
      ])).optional().describe("Columns to include (default: all)"),
      limit: z.number().min(1).max(1000).default(100).describe("Maximum records (1-1000)"),
    }),
    execute: async ({ type, rating, columns, limit }) => {
      logToolExecution("exportAccounts", { type, rating, columns, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (type) where.type = type;
        if (rating) where.rating = rating;

        const accounts = await prisma.account.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        const allColumns = [
          { key: "name", header: "Name" },
          { key: "website", header: "Website" },
          { key: "phone", header: "Phone" },
          { key: "industry", header: "Industry" },
          { key: "type", header: "Type" },
          { key: "rating", header: "Rating" },
          { key: "employees", header: "Employees" },
          { key: "revenue", header: "Revenue" },
          { key: "createdAt", header: "Created At" },
        ];

        const selectedColumns = columns
          ? allColumns.filter(c => columns.includes(c.key as typeof columns[number]))
          : allColumns;

        const csv = generateCSV(accounts as Record<string, unknown>[], selectedColumns);

        return {
          success: true,
          count: accounts.length,
          csv,
          message: `Exported ${accounts.length} accounts to CSV format.`,
        };
      } catch (error) {
        return handleToolError(error, "exportAccounts");
      }
    },
  });

const exportOpportunitiesTool = (orgId: string) =>
  tool({
    description: `Export opportunities to CSV format.

Example: Export won opportunities
- stage: "CLOSED_WON"`,
    parameters: z.object({
      stage: z.string().optional().describe("Filter by stage (e.g., NEGOTIATION, CLOSED_WON)"),
      accountId: z.string().uuid().optional().describe("Filter by account"),
      columns: z.array(z.enum([
        "name", "value", "stage", "probability", "closeDate",
        "accountName", "createdAt"
      ])).optional().describe("Columns to include (default: all)"),
      limit: z.number().min(1).max(1000).default(100).describe("Maximum records (1-1000)"),
    }),
    execute: async ({ stage, accountId, columns, limit }) => {
      logToolExecution("exportOpportunities", { stage, accountId, columns, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (stage) where.stage = stage;
        if (accountId) where.accountId = accountId;

        const opportunities = await prisma.opportunity.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { account: { select: { name: true } } },
        });

        const allColumns = [
          { key: "name", header: "Name" },
          { key: "value", header: "Value" },
          { key: "stage", header: "Stage" },
          { key: "probability", header: "Probability %" },
          { key: "closeDate", header: "Close Date" },
          { key: "accountName", header: "Account" },
          { key: "createdAt", header: "Created At" },
        ];

        const selectedColumns = columns
          ? allColumns.filter(c => columns.includes(c.key as typeof columns[number]) || c.key === "accountName")
          : allColumns;

        const records = opportunities.map(o => ({
          ...o,
          value: Number(o.value),
          accountName: o.account?.name || "",
        }));

        const csv = generateCSV(records as Record<string, unknown>[], selectedColumns);

        return {
          success: true,
          count: opportunities.length,
          csv,
          message: `Exported ${opportunities.length} opportunities to CSV format.`,
        };
      } catch (error) {
        return handleToolError(error, "exportOpportunities");
      }
    },
  });

const exportTicketsTool = (orgId: string) =>
  tool({
    description: `Export support tickets to CSV format.

Example: Export open tickets
- status: "OPEN"`,
    parameters: z.object({
      status: z.enum(["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional()
        .describe("Filter by status"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional()
        .describe("Filter by priority"),
      accountId: z.string().uuid().optional().describe("Filter by account"),
      columns: z.array(z.enum([
        "ticketNumber", "subject", "status", "priority", "category",
        "accountName", "createdAt", "resolvedAt"
      ])).optional().describe("Columns to include (default: all)"),
      limit: z.number().min(1).max(1000).default(100).describe("Maximum records (1-1000)"),
    }),
    execute: async ({ status, priority, accountId, columns, limit }) => {
      logToolExecution("exportTickets", { status, priority, accountId, columns, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (accountId) where.accountId = accountId;

        const tickets = await prisma.ticket.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { account: { select: { name: true } } },
        });

        const allColumns = [
          { key: "ticketNumber", header: "Ticket #" },
          { key: "subject", header: "Subject" },
          { key: "status", header: "Status" },
          { key: "priority", header: "Priority" },
          { key: "category", header: "Category" },
          { key: "accountName", header: "Account" },
          { key: "createdAt", header: "Created At" },
          { key: "resolvedAt", header: "Resolved At" },
        ];

        const selectedColumns = columns
          ? allColumns.filter(c => columns.includes(c.key as typeof columns[number]) || c.key === "accountName")
          : allColumns;

        const records = tickets.map(t => ({
          ...t,
          accountName: t.account?.name || "",
        }));

        const csv = generateCSV(records as Record<string, unknown>[], selectedColumns);

        return {
          success: true,
          count: tickets.length,
          csv,
          message: `Exported ${tickets.length} tickets to CSV format.`,
        };
      } catch (error) {
        return handleToolError(error, "exportTickets");
      }
    },
  });
