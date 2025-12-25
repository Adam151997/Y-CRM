/**
 * Relationship and Deduplication Tools
 * Tools for linking entities and finding/merging duplicates
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError, findSimilarRecords } from "../helpers";

export function createRelationshipTools(orgId: string, userId: string) {
  return {
    linkContactToAccount: linkContactToAccountTool(orgId, userId),
    unlinkContactFromAccount: unlinkContactFromAccountTool(orgId, userId),
    findDuplicateLeads: findDuplicateLeadsTool(orgId),
    findDuplicateContacts: findDuplicateContactsTool(orgId),
    findDuplicateAccounts: findDuplicateAccountsTool(orgId),
    mergeLeads: mergeLeadsTool(orgId, userId),
    mergeContacts: mergeContactsTool(orgId, userId),
  };
}

const linkContactToAccountTool = (orgId: string, userId: string) =>
  tool({
    description: `Link a contact to an account.

Example: Link contact to their new company
- contactId: "contact-uuid"
- accountId: "account-uuid"`,
    parameters: z.object({
      contactId: z.string().uuid().describe("Contact ID to link"),
      accountId: z.string().uuid().describe("Account ID to link to"),
      isPrimary: z.boolean().optional().describe("Set as primary contact for account"),
    }),
    execute: async ({ contactId, accountId, isPrimary }) => {
      logToolExecution("linkContactToAccount", { contactId, accountId, isPrimary });
      try {
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, orgId },
        });
        if (!contact) {
          return { success: false, message: "Contact not found", errorCode: "NOT_FOUND" as const };
        }

        const account = await prisma.account.findFirst({
          where: { id: accountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found", errorCode: "NOT_FOUND" as const };
        }

        await prisma.contact.update({
          where: { id: contactId },
          data: {
            accountId,
            isPrimary: isPrimary || false,
          },
        });

        await createAuditLog({
          orgId,
          action: "LINK",
          module: "CONTACT",
          recordId: contactId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: { linkedTo: accountId, accountName: account.name },
        });

        return {
          success: true,
          message: `Linked ${contact.firstName} ${contact.lastName} to ${account.name}.${isPrimary ? " Set as primary contact." : ""}`,
        };
      } catch (error) {
        return handleToolError(error, "linkContactToAccount");
      }
    },
  });

const unlinkContactFromAccountTool = (orgId: string, userId: string) =>
  tool({
    description: "Remove a contact's link to an account",
    parameters: z.object({
      contactId: z.string().uuid().describe("Contact ID to unlink"),
    }),
    execute: async ({ contactId }) => {
      logToolExecution("unlinkContactFromAccount", { contactId });
      try {
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, orgId },
          include: { account: { select: { name: true } } },
        });
        if (!contact) {
          return { success: false, message: "Contact not found", errorCode: "NOT_FOUND" as const };
        }

        if (!contact.accountId) {
          return { success: false, message: "Contact is not linked to any account" };
        }

        const previousAccount = contact.account?.name;

        await prisma.contact.update({
          where: { id: contactId },
          data: {
            accountId: null,
            isPrimary: false,
          },
        });

        await createAuditLog({
          orgId,
          action: "UNLINK",
          module: "CONTACT",
          recordId: contactId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: { unlinkedFrom: previousAccount },
        });

        return {
          success: true,
          message: `Unlinked ${contact.firstName} ${contact.lastName} from ${previousAccount}.`,
        };
      } catch (error) {
        return handleToolError(error, "unlinkContactFromAccount");
      }
    },
  });

const findDuplicateLeadsTool = (orgId: string) =>
  tool({
    description: `Find potential duplicate leads by name or email.

Example: Find duplicates for a new lead
- email: "john@acme.com"
- name: "John Doe"`,
    parameters: z.object({
      email: z.string().optional().describe("Email to search for duplicates"),
      name: z.string().optional().describe("Name to search for similar matches"),
      company: z.string().optional().describe("Company name to narrow search"),
    }),
    execute: async ({ email, name, company }) => {
      logToolExecution("findDuplicateLeads", { email, name, company });
      try {
        const duplicates = await findSimilarRecords(orgId, "lead", { email, name, company });

        if (duplicates.length === 0) {
          return {
            success: true,
            count: 0,
            duplicates: [],
            message: "No potential duplicates found.",
          };
        }

        return {
          success: true,
          count: duplicates.length,
          duplicates,
          message: `Found ${duplicates.length} potential duplicate lead(s).`,
        };
      } catch (error) {
        return handleToolError(error, "findDuplicateLeads");
      }
    },
  });

const findDuplicateContactsTool = (orgId: string) =>
  tool({
    description: "Find potential duplicate contacts by email",
    parameters: z.object({
      email: z.string().describe("Email to search for duplicates"),
    }),
    execute: async ({ email }) => {
      logToolExecution("findDuplicateContacts", { email });
      try {
        const duplicates = await findSimilarRecords(orgId, "contact", { email });

        if (duplicates.length === 0) {
          return {
            success: true,
            count: 0,
            duplicates: [],
            message: "No potential duplicates found.",
          };
        }

        return {
          success: true,
          count: duplicates.length,
          duplicates,
          message: `Found ${duplicates.length} potential duplicate contact(s).`,
        };
      } catch (error) {
        return handleToolError(error, "findDuplicateContacts");
      }
    },
  });

const findDuplicateAccountsTool = (orgId: string) =>
  tool({
    description: "Find potential duplicate accounts by name",
    parameters: z.object({
      name: z.string().describe("Account/company name to search for duplicates"),
    }),
    execute: async ({ name }) => {
      logToolExecution("findDuplicateAccounts", { name });
      try {
        const duplicates = await findSimilarRecords(orgId, "account", { company: name });

        if (duplicates.length === 0) {
          return {
            success: true,
            count: 0,
            duplicates: [],
            message: "No potential duplicates found.",
          };
        }

        return {
          success: true,
          count: duplicates.length,
          duplicates,
          message: `Found ${duplicates.length} potential duplicate account(s).`,
        };
      } catch (error) {
        return handleToolError(error, "findDuplicateAccounts");
      }
    },
  });

const mergeLeadsTool = (orgId: string, userId: string) =>
  tool({
    description: `Merge duplicate leads into one. The primary lead keeps its data, duplicates are archived.

Example: Merge two duplicate leads
- primaryLeadId: "keep-this-lead-uuid"
- duplicateLeadIds: ["duplicate-lead-uuid"]`,
    parameters: z.object({
      primaryLeadId: z.string().uuid().describe("ID of the lead to keep"),
      duplicateLeadIds: z.array(z.string().uuid()).min(1).max(10).describe("IDs of duplicate leads to merge"),
    }),
    execute: async ({ primaryLeadId, duplicateLeadIds }) => {
      logToolExecution("mergeLeads", { primaryLeadId, duplicateLeadIds });
      try {
        const primaryLead = await prisma.lead.findFirst({
          where: { id: primaryLeadId, orgId },
        });
        if (!primaryLead) {
          return { success: false, message: "Primary lead not found", errorCode: "NOT_FOUND" as const };
        }

        // Get duplicate leads
        const duplicates = await prisma.lead.findMany({
          where: { id: { in: duplicateLeadIds }, orgId },
        });

        if (duplicates.length === 0) {
          return { success: false, message: "No duplicate leads found", errorCode: "NOT_FOUND" as const };
        }

        // Move related records to primary lead
        await prisma.$transaction([
          // Move tasks
          prisma.task.updateMany({
            where: { leadId: { in: duplicateLeadIds } },
            data: { leadId: primaryLeadId },
          }),
          // Move notes
          prisma.note.updateMany({
            where: { leadId: { in: duplicateLeadIds } },
            data: { leadId: primaryLeadId },
          }),
          // Archive duplicates (soft delete by marking status)
          prisma.lead.updateMany({
            where: { id: { in: duplicateLeadIds } },
            data: {
              status: "LOST",
              lostReason: `Merged into lead ${primaryLeadId}`,
            },
          }),
        ]);

        await createAuditLog({
          orgId,
          action: "MERGE",
          module: "LEAD",
          recordId: primaryLeadId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            mergedFrom: duplicateLeadIds,
            mergedCount: duplicates.length,
          },
        });

        return {
          success: true,
          message: `Merged ${duplicates.length} lead(s) into ${primaryLead.firstName} ${primaryLead.lastName}. Tasks and notes transferred.`,
          primaryLeadId,
          mergedCount: duplicates.length,
        };
      } catch (error) {
        return handleToolError(error, "mergeLeads");
      }
    },
  });

const mergeContactsTool = (orgId: string, userId: string) =>
  tool({
    description: `Merge duplicate contacts into one. The primary contact keeps its data, duplicates are deleted.

Example: Merge two duplicate contacts
- primaryContactId: "keep-this-contact-uuid"
- duplicateContactIds: ["duplicate-contact-uuid"]`,
    parameters: z.object({
      primaryContactId: z.string().uuid().describe("ID of the contact to keep"),
      duplicateContactIds: z.array(z.string().uuid()).min(1).max(10).describe("IDs of duplicate contacts to merge"),
    }),
    execute: async ({ primaryContactId, duplicateContactIds }) => {
      logToolExecution("mergeContacts", { primaryContactId, duplicateContactIds });
      try {
        const primaryContact = await prisma.contact.findFirst({
          where: { id: primaryContactId, orgId },
        });
        if (!primaryContact) {
          return { success: false, message: "Primary contact not found", errorCode: "NOT_FOUND" as const };
        }

        // Get duplicate contacts
        const duplicates = await prisma.contact.findMany({
          where: { id: { in: duplicateContactIds }, orgId },
        });

        if (duplicates.length === 0) {
          return { success: false, message: "No duplicate contacts found", errorCode: "NOT_FOUND" as const };
        }

        // Move related records to primary contact
        await prisma.$transaction([
          // Move notes
          prisma.note.updateMany({
            where: { contactId: { in: duplicateContactIds } },
            data: { contactId: primaryContactId },
          }),
          // Delete duplicates
          prisma.contact.deleteMany({
            where: { id: { in: duplicateContactIds } },
          }),
        ]);

        await createAuditLog({
          orgId,
          action: "MERGE",
          module: "CONTACT",
          recordId: primaryContactId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            mergedFrom: duplicateContactIds,
            mergedCount: duplicates.length,
          },
        });

        return {
          success: true,
          message: `Merged ${duplicates.length} contact(s) into ${primaryContact.firstName} ${primaryContact.lastName}. Notes transferred, duplicates removed.`,
          primaryContactId,
          mergedCount: duplicates.length,
        };
      } catch (error) {
        return handleToolError(error, "mergeContacts");
      }
    },
  });
