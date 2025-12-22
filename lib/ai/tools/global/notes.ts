/**
 * Note Tools for All Workspaces
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

export function createNoteTools(orgId: string, userId: string) {
  return {
    createNote: createNoteTool(orgId, userId),
  };
}

const createNoteTool = (orgId: string, userId: string) =>
  tool({
    description: "Add a note to a lead, contact, account, or opportunity",
    parameters: z.object({
      content: z.string().describe("Note content"),
      leadId: z.string().optional().describe("Lead ID (UUID)"),
      contactId: z.string().optional().describe("Contact ID (UUID)"),
      accountId: z.string().optional().describe("Account ID (UUID)"),
      opportunityId: z.string().optional().describe("Opportunity ID (UUID)"),
    }),
    execute: async (params) => {
      logToolExecution("createNote", params);
      try {
        if (!params.leadId && !params.contactId && !params.accountId && !params.opportunityId) {
          return {
            success: false,
            errorCode: "VALIDATION",
            message: "Must specify a record to attach the note to",
          };
        }

        // Check for duplicate note created in last 60 seconds
        const recentDuplicate = await prisma.note.findFirst({
          where: {
            orgId,
            content: { equals: params.content, mode: "insensitive" },
            leadId: params.leadId || undefined,
            contactId: params.contactId || undefined,
            accountId: params.accountId || undefined,
            opportunityId: params.opportunityId || undefined,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createNote] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            noteId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Note already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        const note = await prisma.note.create({
          data: {
            orgId,
            content: params.content,
            leadId: params.leadId,
            contactId: params.contactId,
            accountId: params.accountId,
            opportunityId: params.opportunityId,
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        return { success: true, noteId: note.id, message: "Note added successfully" };
      } catch (error) {
        return handleToolError(error, "createNote");
      }
    },
  });
