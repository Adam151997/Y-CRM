/**
 * Task Tools for All Workspaces
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { revalidateTaskCaches } from "@/lib/cache-utils";
import { logToolExecution, handleToolError, parseNaturalDate } from "../helpers";

export function createTaskTools(orgId: string, userId: string) {
  return {
    createTask: createTaskTool(orgId, userId),
    completeTask: completeTaskTool(orgId, userId),
    searchTasks: searchTasksTool(orgId),
  };
}

const createTaskTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new task. Can be linked to a lead, contact, account, or opportunity.",
    parameters: z.object({
      title: z.string().describe("Task title (required)"),
      description: z.string().optional().describe("Task description"),
      dueDate: z.string().optional().describe("Due date (e.g., 'tomorrow', 'next week', or ISO date)"),
      priority: z.string().optional().describe("Priority: LOW, MEDIUM (default), HIGH, or URGENT"),
      taskType: z.string().optional().describe("Task type: CALL, EMAIL, MEETING, FOLLOW_UP, ONBOARDING, RENEWAL, or OTHER"),
      workspace: z.string().optional().describe("Workspace: sales (default), cs, or marketing"),
      leadId: z.string().optional().describe("Related lead ID (UUID)"),
      contactId: z.string().optional().describe("Related contact ID (UUID)"),
      accountId: z.string().optional().describe("Related account ID (UUID)"),
      opportunityId: z.string().optional().describe("Related opportunity ID (UUID)"),
    }),
    execute: async (params) => {
      logToolExecution("createTask", params);
      try {
        // Check for duplicate task created in last 60 seconds
        const recentDuplicate = await prisma.task.findFirst({
          where: {
            orgId,
            title: { equals: params.title, mode: "insensitive" },
            leadId: params.leadId || undefined,
            contactId: params.contactId || undefined,
            accountId: params.accountId || undefined,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createTask] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            taskId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Task "${recentDuplicate.title}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        let dueDate: Date | null = null;
        if (params.dueDate) {
          dueDate = parseNaturalDate(params.dueDate) || new Date(params.dueDate);
        }

        const task = await prisma.task.create({
          data: {
            orgId,
            title: params.title,
            description: params.description,
            dueDate,
            priority: (params.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
            taskType: params.taskType as "CALL" | "EMAIL" | "MEETING" | "FOLLOW_UP" | "ONBOARDING" | "RENEWAL" | "OTHER" | undefined,
            workspace: (params.workspace as "sales" | "cs" | "marketing") || "sales",
            leadId: params.leadId,
            contactId: params.contactId,
            accountId: params.accountId,
            opportunityId: params.opportunityId,
            status: "PENDING",
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "TASK",
          recordId: task.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: task as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant", workspace: params.workspace },
        });

        revalidateTaskCaches();

        return {
          success: true,
          taskId: task.id,
          message: `Created task: "${task.title}"${dueDate ? ` due ${dueDate.toLocaleDateString()}` : ""} (ID: ${task.id})`,
        };
      } catch (error) {
        return handleToolError(error, "createTask");
      }
    },
  });

const completeTaskTool = (orgId: string, userId: string) =>
  tool({
    description: "Mark a task as completed",
    parameters: z.object({
      taskId: z.string().describe("The task ID (UUID) to complete"),
    }),
    execute: async ({ taskId }) => {
      logToolExecution("completeTask", { taskId });
      try {
        const existing = await prisma.task.findFirst({
          where: { id: taskId, orgId },
        });

        if (!existing) {
          return { success: false, message: "Task not found" };
        }

        const task = await prisma.task.update({
          where: { id: taskId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "TASK",
          recordId: task.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: task as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant", action: "completed" },
        });

        revalidateTaskCaches();

        return { success: true, message: `Completed task: "${task.title}"` };
      } catch (error) {
        return handleToolError(error, "completeTask");
      }
    },
  });

const searchTasksTool = (orgId: string) =>
  tool({
    description: "Search for tasks across all workspaces",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      status: z.string().optional().describe("Filter by status: PENDING, IN_PROGRESS, COMPLETED, or CANCELLED"),
      priority: z.string().optional().describe("Filter by priority: LOW, MEDIUM, HIGH, or URGENT"),
      workspace: z.string().optional().describe("Filter by workspace: sales, cs, or marketing"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, status, priority, workspace, limit = 5 }) => {
      logToolExecution("searchTasks", { query, status, priority, workspace, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (workspace) where.workspace = workspace;
        if (query) {
          where.title = { contains: query, mode: "insensitive" };
        }

        const tasks = await prisma.task.findMany({
          where,
          take: limit,
          orderBy: { dueDate: "asc" },
        });

        return {
          success: true,
          count: tasks.length,
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            workspace: t.workspace,
            dueDate: t.dueDate?.toISOString(),
          })),
        };
      } catch (error) {
        return { ...handleToolError(error, "searchTasks"), count: 0, tasks: [] };
      }
    },
  });
