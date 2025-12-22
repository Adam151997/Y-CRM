/**
 * Semantic Search Tools
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { logToolExecution, handleToolError } from "../helpers";

export function createSearchTools(orgId: string) {
  return {
    semanticSearch: semanticSearchTool(orgId),
  };
}

const semanticSearchTool = (orgId: string) =>
  tool({
    description: "Search across all CRM data using natural language. Use this for finding information when you're not sure of exact names or want to find related records.",
    parameters: z.object({
      query: z.string().describe("Natural language search query"),
      entityTypes: z.array(z.enum(["LEAD", "CONTACT", "ACCOUNT", "NOTE"])).optional()
        .describe("Limit search to specific entity types"),
      limit: z.number().min(1).max(20).default(5).describe("Maximum results"),
    }),
    execute: async ({ query, entityTypes, limit }) => {
      logToolExecution("semanticSearch", { query, entityTypes, limit });
      try {
        const { semanticSearch } = await import("@/lib/embeddings");

        const results = await semanticSearch({
          orgId,
          query,
          entityTypes,
          limit,
        });

        if (results.length === 0) {
          return {
            success: true,
            count: 0,
            results: [],
            message: "No matching records found. Try a different search term.",
          };
        }

        const enrichedResults = await Promise.all(
          results.map(async (r) => {
            let details = "";
            switch (r.entityType) {
              case "LEAD": {
                const lead = await prisma.lead.findUnique({
                  where: { id: r.entityId },
                  select: { firstName: true, lastName: true, company: true, status: true },
                });
                if (lead) details = `${lead.firstName} ${lead.lastName}${lead.company ? ` at ${lead.company}` : ""} (${lead.status})`;
                break;
              }
              case "CONTACT": {
                const contact = await prisma.contact.findUnique({
                  where: { id: r.entityId },
                  select: { firstName: true, lastName: true, email: true },
                });
                if (contact) details = `${contact.firstName} ${contact.lastName}${contact.email ? ` <${contact.email}>` : ""}`;
                break;
              }
              case "ACCOUNT": {
                const account = await prisma.account.findUnique({
                  where: { id: r.entityId },
                  select: { name: true, industry: true },
                });
                if (account) details = `${account.name}${account.industry ? ` (${account.industry})` : ""}`;
                break;
              }
              case "NOTE": {
                const note = await prisma.note.findUnique({
                  where: { id: r.entityId },
                  select: { content: true },
                });
                if (note) details = note.content.substring(0, 100) + (note.content.length > 100 ? "..." : "");
                break;
              }
            }
            return {
              type: r.entityType,
              id: r.entityId,
              similarity: Math.round(r.similarity * 100) + "%",
              details,
            };
          })
        );

        return {
          success: true,
          count: enrichedResults.length,
          results: enrichedResults.filter((r) => r.details),
        };
      } catch (error) {
        console.error("[Tool:semanticSearch] Error:", error);
        return {
          success: false,
          count: 0,
          results: [],
          message: "Semantic search is not available.",
        };
      }
    },
  });
