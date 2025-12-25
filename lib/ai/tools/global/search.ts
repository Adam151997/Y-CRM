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

        // Batch fetch entities by type to avoid N+1 queries
        const leadIds = results.filter(r => r.entityType === "LEAD").map(r => r.entityId);
        const contactIds = results.filter(r => r.entityType === "CONTACT").map(r => r.entityId);
        const accountIds = results.filter(r => r.entityType === "ACCOUNT").map(r => r.entityId);
        const noteIds = results.filter(r => r.entityType === "NOTE").map(r => r.entityId);

        // Fetch all entities in parallel batches
        const [leads, contacts, accounts, notes] = await Promise.all([
          leadIds.length > 0
            ? prisma.lead.findMany({
                where: { id: { in: leadIds } },
                select: { id: true, firstName: true, lastName: true, company: true, status: true },
              })
            : [],
          contactIds.length > 0
            ? prisma.contact.findMany({
                where: { id: { in: contactIds } },
                select: { id: true, firstName: true, lastName: true, email: true },
              })
            : [],
          accountIds.length > 0
            ? prisma.account.findMany({
                where: { id: { in: accountIds } },
                select: { id: true, name: true, industry: true },
              })
            : [],
          noteIds.length > 0
            ? prisma.note.findMany({
                where: { id: { in: noteIds } },
                select: { id: true, content: true },
              })
            : [],
        ]);

        // Create lookup maps for O(1) access
        const leadMap = new Map(leads.map(l => [l.id, l]));
        const contactMap = new Map(contacts.map(c => [c.id, c]));
        const accountMap = new Map(accounts.map(a => [a.id, a]));
        const noteMap = new Map(notes.map(n => [n.id, n]));

        // Enrich results using maps (no additional queries)
        const enrichedResults = results.map((r) => {
          let details = "";
          switch (r.entityType) {
            case "LEAD": {
              const lead = leadMap.get(r.entityId);
              if (lead) details = `${lead.firstName} ${lead.lastName}${lead.company ? ` at ${lead.company}` : ""} (${lead.status})`;
              break;
            }
            case "CONTACT": {
              const contact = contactMap.get(r.entityId);
              if (contact) details = `${contact.firstName} ${contact.lastName}${contact.email ? ` <${contact.email}>` : ""}`;
              break;
            }
            case "ACCOUNT": {
              const account = accountMap.get(r.entityId);
              if (account) details = `${account.name}${account.industry ? ` (${account.industry})` : ""}`;
              break;
            }
            case "NOTE": {
              const note = noteMap.get(r.entityId);
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
        });

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
