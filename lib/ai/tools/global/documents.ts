/**
 * Document Tools for All Workspaces
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

export function createDocumentTools(orgId: string) {
  return {
    searchDocuments: searchDocumentsTool(orgId),
    getDocumentStats: getDocumentStatsTool(orgId),
    analyzeDocument: analyzeDocumentTool(orgId),
  };
}

const searchDocumentsTool = (orgId: string) =>
  tool({
    description: "Search for documents in the CRM.",
    parameters: z.object({
      query: z.string().optional().describe("Search term to match document name"),
      type: z.enum(["CONTRACT", "PROPOSAL", "INVOICE", "PRESENTATION", "OTHER"]).optional(),
      leadId: z.string().uuid().optional(),
      accountId: z.string().uuid().optional(),
      limit: z.number().min(1).max(20).default(10),
    }),
    execute: async ({ query, type, leadId, accountId, limit }) => {
      logToolExecution("searchDocuments", { query, type, leadId, accountId, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (type) where.type = type;
        if (leadId) where.leadId = leadId;
        if (accountId) where.accountId = accountId;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }

        const documents = await prisma.document.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            lead: { select: { firstName: true, lastName: true } },
            account: { select: { name: true } },
          },
        });

        return {
          success: true,
          count: documents.length,
          documents: documents.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            size: `${(d.fileSize / 1024).toFixed(1)} KB`,
            url: d.fileUrl,
            linkedTo: d.lead
              ? `Lead: ${d.lead.firstName} ${d.lead.lastName}`
              : d.account
              ? `Account: ${d.account.name}`
              : null,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchDocuments"), count: 0, documents: [] };
      }
    },
  });

const getDocumentStatsTool = (orgId: string) =>
  tool({
    description: "Get statistics about documents",
    parameters: z.object({}),
    execute: async () => {
      logToolExecution("getDocumentStats", {});
      try {
        const [totalCount, byType, totalSize] = await Promise.all([
          prisma.document.count({ where: { orgId } }),
          prisma.document.groupBy({
            by: ["type"],
            where: { orgId },
            _count: true,
          }),
          prisma.document.aggregate({
            where: { orgId },
            _sum: { fileSize: true },
          }),
        ]);

        return {
          success: true,
          stats: {
            totalDocuments: totalCount,
            totalStorageUsed: `${((totalSize._sum.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB`,
            byType: byType.reduce((acc, { type, _count }) => {
              acc[type] = _count;
              return acc;
            }, {} as Record<string, number>),
          },
        };
      } catch (error) {
        return { ...handleToolError(error, "getDocumentStats"), stats: null };
      }
    },
  });

const analyzeDocumentTool = (orgId: string) =>
  tool({
    description: "Get details about a specific document",
    parameters: z.object({
      documentId: z.string().uuid().optional(),
      documentName: z.string().optional(),
    }),
    execute: async ({ documentId, documentName }) => {
      logToolExecution("analyzeDocument", { documentId, documentName });
      try {
        let document;

        if (documentId) {
          document = await prisma.document.findFirst({
            where: { id: documentId, orgId },
            include: {
              lead: { select: { firstName: true, lastName: true, email: true } },
              account: { select: { name: true, industry: true } },
            },
          });
        } else if (documentName) {
          document = await prisma.document.findFirst({
            where: {
              orgId,
              name: { contains: documentName, mode: "insensitive" },
            },
            include: {
              lead: { select: { firstName: true, lastName: true, email: true } },
              account: { select: { name: true, industry: true } },
            },
          });
        }

        if (!document) {
          return { success: false, message: "Document not found" };
        }

        return {
          success: true,
          document: {
            id: document.id,
            name: document.name,
            type: document.type,
            mimeType: document.mimeType,
            size: `${(document.fileSize / 1024).toFixed(1)} KB`,
            url: document.fileUrl,
            linkedTo: document.lead
              ? { type: "Lead", name: `${document.lead.firstName} ${document.lead.lastName}` }
              : document.account
              ? { type: "Account", name: document.account.name }
              : null,
          },
        };
      } catch (error) {
        return { ...handleToolError(error, "analyzeDocument") };
      }
    },
  });
