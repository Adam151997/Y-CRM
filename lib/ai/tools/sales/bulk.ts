/**
 * Bulk operations for sales entities (leads, contacts, accounts)
 */

import { z } from "zod";
import { tool } from "ai";
import {
  prisma,
  handleToolError,
  logToolExecution,
  processBulkOperation,
  validateEmail,
  normalizePhone,
  resolveAssignment,
} from "../helpers";
import { revalidateLeadCaches, revalidateContactCaches, revalidateAccountCaches } from "@/lib/cache-utils";
import type { BulkOperationResult } from "../types";

/**
 * Schema for a single lead in bulk create
 */
const bulkLeadSchema = z.object({
  firstName: z.string().describe("First name (required)"),
  lastName: z.string().describe("Last name (required)"),
  email: z.string().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  company: z.string().optional().describe("Company name"),
  title: z.string().optional().describe("Job title"),
  source: z.enum(["REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN", "TRADE_SHOW", "ADVERTISEMENT", "EMAIL_CAMPAIGN", "OTHER"]).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
});

/**
 * Schema for a single contact in bulk create
 */
const bulkContactSchema = z.object({
  firstName: z.string().describe("First name (required)"),
  lastName: z.string().describe("Last name (required)"),
  email: z.string().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  title: z.string().optional().describe("Job title"),
  accountName: z.string().optional().describe("Account/company name to link to"),
});

/**
 * Schema for a single account in bulk create
 */
const bulkAccountSchema = z.object({
  name: z.string().describe("Account/company name (required)"),
  website: z.string().optional().describe("Website URL"),
  phone: z.string().optional().describe("Phone number"),
  industry: z.string().optional().describe("Industry"),
  type: z.enum(["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"]).optional(),
  rating: z.enum(["HOT", "WARM", "COLD"]).optional(),
});

export function createBulkTools(orgId: string, userId: string) {
  return {
    /**
     * Bulk create leads
     */
    bulkCreateLeads: tool({
      description: `Create multiple leads at once. Maximum 50 leads per call.

Example: Create 3 leads from a conference:
- leads: [
    { firstName: "John", lastName: "Doe", email: "john@acme.com", company: "Acme Corp", source: "TRADE_SHOW" },
    { firstName: "Jane", lastName: "Smith", email: "jane@tech.io", company: "TechCo", source: "TRADE_SHOW" },
    { firstName: "Bob", lastName: "Wilson", company: "StartupXYZ", source: "TRADE_SHOW" }
  ]`,
      parameters: z.object({
        leads: z.array(bulkLeadSchema).min(1).max(50).describe("Array of leads to create (1-50)"),
        assignTo: z.string().optional().describe("Assign all leads to this user (name, email, or 'me')"),
        skipDuplicates: z.boolean().optional().describe("Skip leads with duplicate emails (default: true)"),
      }),
      execute: async ({ leads, assignTo, skipDuplicates = true }) => {
        logToolExecution("bulkCreateLeads", { count: leads.length, assignTo, skipDuplicates });

        try {
          // Resolve assignment if provided
          const assignee = await resolveAssignment(orgId, assignTo, userId);

          // Check for existing emails to skip duplicates
          const existingEmails = new Set<string>();
          if (skipDuplicates) {
            const emails = leads.map(l => l.email?.toLowerCase()).filter(Boolean) as string[];
            if (emails.length > 0) {
              const existing = await prisma.lead.findMany({
                where: { orgId, email: { in: emails } },
                select: { email: true },
              });
              existing.forEach(e => e.email && existingEmails.add(e.email.toLowerCase()));
            }
          }

          const result = await processBulkOperation(leads, async (lead, index) => {
            // Validate email if provided
            if (lead.email) {
              const emailResult = validateEmail(lead.email);
              if (!emailResult.valid) {
                return { success: false, error: emailResult.error };
              }
              lead.email = emailResult.normalized;

              // Skip if duplicate
              if (skipDuplicates && existingEmails.has(lead.email!.toLowerCase())) {
                return { success: false, error: `Duplicate email: ${lead.email}` };
              }
            }

            // Validate phone if provided
            if (lead.phone) {
              const phoneResult = normalizePhone(lead.phone);
              if (!phoneResult.valid) {
                return { success: false, error: phoneResult.error };
              }
              lead.phone = phoneResult.normalized;
            }

            const created = await prisma.lead.create({
              data: {
                orgId,
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                title: lead.title,
                source: lead.source || "OTHER",
                status: lead.status || "NEW",
                assignedToId: assignee?.id,
              },
            });

            return { success: true, id: created.id };
          });

          await revalidateLeadCaches(orgId);

          const response: BulkOperationResult = {
            success: result.failureCount === 0,
            message: `Created ${result.successCount} of ${result.totalRequested} leads.${
              result.failureCount > 0 ? ` ${result.failureCount} failed.` : ""
            }${assignee ? ` Assigned to ${assignee.name}.` : ""}`,
            errorCode: result.failureCount > 0 && result.successCount > 0 ? "BULK_PARTIAL" : undefined,
            totalRequested: result.totalRequested,
            successCount: result.successCount,
            failureCount: result.failureCount,
            results: result.results,
          };

          return response;
        } catch (error) {
          return handleToolError(error, "bulkCreateLeads");
        }
      },
    }),

    /**
     * Bulk create contacts
     */
    bulkCreateContacts: tool({
      description: `Create multiple contacts at once. Maximum 50 contacts per call.

Example: Create contacts for an account:
- contacts: [
    { firstName: "John", lastName: "Doe", email: "john@acme.com", title: "CEO", accountName: "Acme Corp" },
    { firstName: "Jane", lastName: "Smith", email: "jane@acme.com", title: "CTO", accountName: "Acme Corp" }
  ]`,
      parameters: z.object({
        contacts: z.array(bulkContactSchema).min(1).max(50).describe("Array of contacts to create (1-50)"),
        skipDuplicates: z.boolean().optional().describe("Skip contacts with duplicate emails (default: true)"),
      }),
      execute: async ({ contacts, skipDuplicates = true }) => {
        logToolExecution("bulkCreateContacts", { count: contacts.length, skipDuplicates });

        try {
          // Pre-resolve all account names to IDs
          const accountNames = Array.from(new Set(contacts.map(c => c.accountName).filter(Boolean))) as string[];
          const accountMap = new Map<string, string>();

          if (accountNames.length > 0) {
            const accounts = await prisma.account.findMany({
              where: {
                orgId,
                name: { in: accountNames, mode: "insensitive" },
              },
              select: { id: true, name: true },
            });
            accounts.forEach(a => accountMap.set(a.name.toLowerCase(), a.id));
          }

          // Check for existing emails
          const existingEmails = new Set<string>();
          if (skipDuplicates) {
            const emails = contacts.map(c => c.email?.toLowerCase()).filter(Boolean) as string[];
            if (emails.length > 0) {
              const existing = await prisma.contact.findMany({
                where: { orgId, email: { in: emails } },
                select: { email: true },
              });
              existing.forEach(e => e.email && existingEmails.add(e.email.toLowerCase()));
            }
          }

          const result = await processBulkOperation(contacts, async (contact, index) => {
            // Validate email if provided
            if (contact.email) {
              const emailResult = validateEmail(contact.email);
              if (!emailResult.valid) {
                return { success: false, error: emailResult.error };
              }
              contact.email = emailResult.normalized;

              if (skipDuplicates && existingEmails.has(contact.email!.toLowerCase())) {
                return { success: false, error: `Duplicate email: ${contact.email}` };
              }
            }

            // Validate phone if provided
            if (contact.phone) {
              const phoneResult = normalizePhone(contact.phone);
              if (!phoneResult.valid) {
                return { success: false, error: phoneResult.error };
              }
              contact.phone = phoneResult.normalized;
            }

            // Resolve account
            let accountId: string | undefined;
            if (contact.accountName) {
              accountId = accountMap.get(contact.accountName.toLowerCase());
              if (!accountId) {
                return { success: false, error: `Account not found: ${contact.accountName}` };
              }
            }

            const created = await prisma.contact.create({
              data: {
                orgId,
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                title: contact.title,
                accountId,
              },
            });

            return { success: true, id: created.id };
          });

          await revalidateContactCaches(orgId);

          const response: BulkOperationResult = {
            success: result.failureCount === 0,
            message: `Created ${result.successCount} of ${result.totalRequested} contacts.${
              result.failureCount > 0 ? ` ${result.failureCount} failed.` : ""
            }`,
            errorCode: result.failureCount > 0 && result.successCount > 0 ? "BULK_PARTIAL" : undefined,
            totalRequested: result.totalRequested,
            successCount: result.successCount,
            failureCount: result.failureCount,
            results: result.results,
          };

          return response;
        } catch (error) {
          return handleToolError(error, "bulkCreateContacts");
        }
      },
    }),

    /**
     * Bulk create accounts
     */
    bulkCreateAccounts: tool({
      description: `Create multiple accounts at once. Maximum 50 accounts per call.

Example: Create accounts from a list:
- accounts: [
    { name: "Acme Corp", website: "https://acme.com", industry: "Technology", type: "PROSPECT", rating: "HOT" },
    { name: "TechCo Inc", website: "https://techco.io", industry: "Software", type: "PROSPECT" }
  ]`,
      parameters: z.object({
        accounts: z.array(bulkAccountSchema).min(1).max(50).describe("Array of accounts to create (1-50)"),
        assignTo: z.string().optional().describe("Assign all accounts to this user (name, email, or 'me')"),
        skipDuplicates: z.boolean().optional().describe("Skip accounts with duplicate names (default: true)"),
      }),
      execute: async ({ accounts, assignTo, skipDuplicates = true }) => {
        logToolExecution("bulkCreateAccounts", { count: accounts.length, assignTo, skipDuplicates });

        try {
          const assignee = await resolveAssignment(orgId, assignTo, userId);

          // Check for existing account names
          const existingNames = new Set<string>();
          if (skipDuplicates) {
            const names = accounts.map(a => a.name.toLowerCase());
            const existing = await prisma.account.findMany({
              where: {
                orgId,
                name: { in: accounts.map(a => a.name), mode: "insensitive" },
              },
              select: { name: true },
            });
            existing.forEach(e => existingNames.add(e.name.toLowerCase()));
          }

          const result = await processBulkOperation(accounts, async (account, index) => {
            if (skipDuplicates && existingNames.has(account.name.toLowerCase())) {
              return { success: false, error: `Duplicate account: ${account.name}` };
            }

            // Validate phone if provided
            if (account.phone) {
              const phoneResult = normalizePhone(account.phone);
              if (!phoneResult.valid) {
                return { success: false, error: phoneResult.error };
              }
              account.phone = phoneResult.normalized;
            }

            const created = await prisma.account.create({
              data: {
                orgId,
                name: account.name,
                website: account.website,
                phone: account.phone,
                industry: account.industry,
                type: account.type || "PROSPECT",
                rating: account.rating,
                assignedToId: assignee?.id,
              },
            });

            return { success: true, id: created.id };
          });

          await revalidateAccountCaches(orgId);

          const response: BulkOperationResult = {
            success: result.failureCount === 0,
            message: `Created ${result.successCount} of ${result.totalRequested} accounts.${
              result.failureCount > 0 ? ` ${result.failureCount} failed.` : ""
            }${assignee ? ` Assigned to ${assignee.name}.` : ""}`,
            errorCode: result.failureCount > 0 && result.successCount > 0 ? "BULK_PARTIAL" : undefined,
            totalRequested: result.totalRequested,
            successCount: result.successCount,
            failureCount: result.failureCount,
            results: result.results,
          };

          return response;
        } catch (error) {
          return handleToolError(error, "bulkCreateAccounts");
        }
      },
    }),

    /**
     * Bulk update lead status
     */
    batchUpdateLeadStatus: tool({
      description: `Update status for multiple leads at once.

Example: Mark leads as qualified:
- leadIds: ["id1", "id2", "id3"]
- status: "QUALIFIED"

Or by query:
- query: "TechConf 2024"
- status: "CONTACTED"`,
      parameters: z.object({
        leadIds: z.array(z.string()).optional().describe("Array of lead IDs to update"),
        query: z.string().optional().describe("Search query to find leads to update (alternative to leadIds)"),
        status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]).describe("New status to set"),
        reason: z.string().optional().describe("Reason for status change (especially for LOST)"),
      }),
      execute: async ({ leadIds, query, status, reason }) => {
        logToolExecution("batchUpdateLeadStatus", { leadIds, query, status });

        try {
          let idsToUpdate: string[] = [];

          if (leadIds && leadIds.length > 0) {
            idsToUpdate = leadIds;
          } else if (query) {
            const matches = await prisma.lead.findMany({
              where: {
                orgId,
                OR: [
                  { firstName: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                  { company: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              },
              select: { id: true },
              take: 50,
            });
            idsToUpdate = matches.map(m => m.id);
          }

          if (idsToUpdate.length === 0) {
            return {
              success: false,
              message: "No leads found to update.",
              errorCode: "NOT_FOUND" as const,
            };
          }

          const updateData: Record<string, unknown> = { status };
          if (reason && status === "LOST") {
            updateData.lostReason = reason;
          }

          const updated = await prisma.lead.updateMany({
            where: { id: { in: idsToUpdate }, orgId },
            data: updateData,
          });

          await revalidateLeadCaches(orgId);

          return {
            success: true,
            message: `Updated ${updated.count} leads to status: ${status}.`,
            updatedCount: updated.count,
            status,
          };
        } catch (error) {
          return handleToolError(error, "batchUpdateLeadStatus");
        }
      },
    }),

    /**
     * Bulk update task status
     */
    batchUpdateTaskStatus: tool({
      description: `Mark multiple tasks as completed or update their status.

Example: Complete all tasks for a lead:
- leadId: "lead-uuid"
- status: "COMPLETED"

Or by IDs:
- taskIds: ["task1", "task2"]
- status: "COMPLETED"`,
      parameters: z.object({
        taskIds: z.array(z.string()).optional().describe("Array of task IDs to update"),
        leadId: z.string().optional().describe("Update all tasks for this lead"),
        accountId: z.string().optional().describe("Update all tasks for this account"),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).describe("New status to set"),
      }),
      execute: async ({ taskIds, leadId, accountId, status }) => {
        logToolExecution("batchUpdateTaskStatus", { taskIds, leadId, accountId, status });

        try {
          const where: Record<string, unknown> = { orgId };

          if (taskIds && taskIds.length > 0) {
            where.id = { in: taskIds };
          } else if (leadId) {
            where.leadId = leadId;
          } else if (accountId) {
            where.accountId = accountId;
          } else {
            return {
              success: false,
              message: "Please provide taskIds, leadId, or accountId.",
              errorCode: "VALIDATION" as const,
            };
          }

          const updateData: Record<string, unknown> = { status };
          if (status === "COMPLETED") {
            updateData.completedAt = new Date();
          }

          const updated = await prisma.task.updateMany({
            where,
            data: updateData,
          });

          return {
            success: true,
            message: `Updated ${updated.count} tasks to status: ${status}.`,
            updatedCount: updated.count,
            status,
          };
        } catch (error) {
          return handleToolError(error, "batchUpdateTaskStatus");
        }
      },
    }),
  };
}
