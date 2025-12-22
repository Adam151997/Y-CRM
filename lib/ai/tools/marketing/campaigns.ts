/**
 * Campaign Tools for Marketing Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateCampaignCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError } from "../helpers";

export function createCampaignTools(orgId: string, userId: string) {
  return {
    createCampaign: createCampaignTool(orgId, userId),
    searchCampaigns: searchCampaignsTool(orgId),
  };
}

const createCampaignTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new marketing campaign",
    parameters: z.object({
      name: z.string().describe("Campaign name (required)"),
      description: z.string().optional(),
      type: z.string().describe("Campaign type: EMAIL, SOCIAL, EVENT, WEBINAR, SMS, or ADS"),
      segmentId: z.string().optional().describe("Target segment ID (UUID)"),
      subject: z.string().optional().describe("Email subject or headline"),
      scheduledAt: z.string().optional().describe("Schedule time (ISO format)"),
    }),
    execute: async (params) => {
      logToolExecution("createCampaign", params);
      try {
        // Check for duplicate campaign created in last 60 seconds
        const recentDuplicate = await prisma.campaign.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createCampaign] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            campaignId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Campaign "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        if (params.segmentId) {
          const segment = await prisma.segment.findFirst({
            where: { id: params.segmentId, orgId },
          });
          if (!segment) {
            return { success: false, message: "Segment not found" };
          }
        }

        const campaign = await prisma.campaign.create({
          data: {
            orgId,
            name: params.name,
            description: params.description,
            type: params.type as "EMAIL" | "SOCIAL" | "EVENT" | "WEBINAR" | "SMS" | "ADS",
            segmentId: params.segmentId,
            subject: params.subject,
            scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
            status: "DRAFT",
            createdById: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CAMPAIGN",
          recordId: campaign.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: campaign as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateCampaignCaches();

        return {
          success: true,
          campaignId: campaign.id,
          message: `Created ${params.type} campaign "${campaign.name}" (ID: ${campaign.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createCampaign");
      }
    },
  });

const searchCampaignsTool = (orgId: string) =>
  tool({
    description: "Search for marketing campaigns",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      status: z.string().optional().describe("Filter by status: DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, or CANCELLED"),
      type: z.string().optional().describe("Filter by type: EMAIL, SOCIAL, EVENT, WEBINAR, SMS, or ADS"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, status, type, limit = 10 }) => {
      logToolExecution("searchCampaigns", { query, status, type, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (type) where.type = type;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }

        const campaigns = await prisma.campaign.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            segment: { select: { name: true, memberCount: true } },
          },
        });

        return {
          success: true,
          count: campaigns.length,
          campaigns: campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            status: c.status,
            segment: c.segment?.name,
            audienceSize: c.segment?.memberCount,
            scheduledAt: c.scheduledAt?.toISOString(),
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchCampaigns"), count: 0, campaigns: [] };
      }
    },
  });
