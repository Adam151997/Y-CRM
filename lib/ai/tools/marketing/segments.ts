/**
 * Segment Tools for Marketing Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateSegmentCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError } from "../helpers";

export function createSegmentTools(orgId: string, userId: string) {
  return {
    createSegment: createSegmentTool(orgId, userId),
    searchSegments: searchSegmentsTool(orgId),
  };
}

const createSegmentTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new audience segment for marketing. For rules, provide a JSON string like: [{\"field\":\"industry\",\"operator\":\"equals\",\"value\":\"Tech\"}]",
    parameters: z.object({
      name: z.string().describe("Segment name (required)"),
      description: z.string().optional(),
      type: z.string().optional().describe("Segment type: DYNAMIC or STATIC (default: DYNAMIC)"),
      rulesJson: z.string().optional().describe("JSON string of rules array, e.g. [{\"field\":\"industry\",\"operator\":\"equals\",\"value\":\"Tech\"}]. Operators: equals, not_equals, contains, not_contains, greater_than, less_than"),
      ruleLogic: z.string().optional().describe("Rule logic: AND or OR (default: AND)"),
    }),
    execute: async (params) => {
      logToolExecution("createSegment", params);
      try {
        // Check for duplicate segment created in last 60 seconds
        const recentDuplicate = await prisma.segment.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createSegment] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            segmentId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Segment "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Parse rules from JSON string if provided
        let rules: unknown[] = [];
        if (params.rulesJson) {
          try {
            rules = JSON.parse(params.rulesJson);
          } catch {
            return { success: false, message: "Invalid rulesJson format. Expected JSON array." };
          }
        }

        const segment = await prisma.segment.create({
          data: {
            orgId,
            name: params.name,
            description: params.description,
            type: (params.type as "DYNAMIC" | "STATIC") || "DYNAMIC",
            rules: rules as import("@prisma/client").Prisma.InputJsonValue,
            ruleLogic: (params.ruleLogic as "AND" | "OR") || "AND",
            createdById: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "SEGMENT",
          recordId: segment.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: segment as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateSegmentCaches();

        return {
          success: true,
          segmentId: segment.id,
          message: `Created segment "${segment.name}" (ID: ${segment.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createSegment");
      }
    },
  });

const searchSegmentsTool = (orgId: string) =>
  tool({
    description: "Search for audience segments",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      isActive: z.boolean().optional().describe("Filter by active status"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, isActive, limit = 10 }) => {
      logToolExecution("searchSegments", { query, isActive, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (isActive !== undefined) where.isActive = isActive;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }

        const segments = await prisma.segment.findMany({
          where,
          take: limit,
          orderBy: { memberCount: "desc" },
        });

        return {
          success: true,
          count: segments.length,
          segments: segments.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            memberCount: s.memberCount,
            isActive: s.isActive,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchSegments"), count: 0, segments: [] };
      }
    },
  });
