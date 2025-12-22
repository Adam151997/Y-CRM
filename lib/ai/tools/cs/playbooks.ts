/**
 * Playbook Tools for Customer Success Workspace
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidatePlaybookCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError } from "../helpers";

export function createPlaybookTools(orgId: string, userId: string) {
  return {
    searchPlaybooks: searchPlaybooksTool(orgId),
    runPlaybook: runPlaybookTool(orgId, userId),
  };
}

const searchPlaybooksTool = (orgId: string) =>
  tool({
    description: "Search for customer success playbooks",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      trigger: z.string().optional().describe("Filter by trigger: MANUAL, NEW_CUSTOMER, RENEWAL_APPROACHING, HEALTH_DROP, or TICKET_ESCALATION"),
      isActive: z.boolean().optional().describe("Filter by active status (default: true)"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, trigger, isActive = true, limit = 10 }) => {
      logToolExecution("searchPlaybooks", { query, trigger, isActive, limit });
      try {
        const where: Record<string, unknown> = { orgId, isActive };
        if (trigger) where.trigger = trigger;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }

        const playbooks = await prisma.playbook.findMany({
          where,
          take: limit,
          orderBy: { name: "asc" },
        });

        return {
          success: true,
          count: playbooks.length,
          playbooks: playbooks.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            trigger: p.trigger,
            stepCount: Array.isArray(p.steps) ? (p.steps as unknown[]).length : 0,
            isActive: p.isActive,
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchPlaybooks"), count: 0, playbooks: [] };
      }
    },
  });

const runPlaybookTool = (orgId: string, userId: string) =>
  tool({
    description: "Start running a playbook for an account",
    parameters: z.object({
      playbookId: z.string().describe("Playbook ID (UUID) to run"),
      accountId: z.string().describe("Account ID (UUID) to run playbook for"),
    }),
    execute: async ({ playbookId, accountId }) => {
      logToolExecution("runPlaybook", { playbookId, accountId });
      try {
        const playbook = await prisma.playbook.findFirst({
          where: { id: playbookId, orgId, isActive: true },
        });
        if (!playbook) {
          return { success: false, message: "Playbook not found or inactive" };
        }

        const account = await prisma.account.findFirst({
          where: { id: accountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found" };
        }

        const steps = Array.isArray(playbook.steps) ? (playbook.steps as unknown[]) : [];

        const run = await prisma.playbookRun.create({
          data: {
            orgId,
            playbookId,
            accountId,
            status: "IN_PROGRESS",
            currentStep: 0,
            totalSteps: steps.length,
            startedById: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "PLAYBOOK",
          recordId: run.id,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: { source: "ai_assistant", playbookName: playbook.name, accountName: account.name },
        });

        revalidatePlaybookCaches();

        return {
          success: true,
          runId: run.id,
          message: `Started playbook "${playbook.name}" for ${account.name} (Run ID: ${run.id})`,
        };
      } catch (error) {
        return handleToolError(error, "runPlaybook");
      }
    },
  });
