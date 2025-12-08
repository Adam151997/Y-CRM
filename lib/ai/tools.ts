import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  revalidateLeadCaches,
  revalidateContactCaches,
  revalidateAccountCaches,
  revalidateTaskCaches,
  revalidateOpportunityCaches,
} from "@/lib/cache-utils";
import {
  getActiveConnections,
  executeComposioToolDirect,
  FEATURED_APPS,
} from "@/lib/composio";

/**
 * AI Tools for Y-CRM
 * These tools allow the AI to interact with CRM data
 */

// =============================================================================
// LEAD TOOLS
// =============================================================================

export const createLeadTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new lead in the CRM. Use this when the user wants to add a new lead or prospect.",
    parameters: z.object({
      firstName: z.string().describe("Lead's first name (required)"),
      lastName: z.string().describe("Lead's last name (required)"),
      email: z.string().email().optional().describe("Lead's email address"),
      phone: z.string().optional().describe("Lead's phone number"),
      company: z.string().optional().describe("Company name"),
      title: z.string().optional().describe("Job title"),
      source: z
        .enum([
          "REFERRAL",
          "WEBSITE",
          "COLD_CALL",
          "LINKEDIN",
          "TRADE_SHOW",
          "ADVERTISEMENT",
          "EMAIL_CAMPAIGN",
          "OTHER",
        ])
        .optional()
        .describe("Lead source"),
    }),
    execute: async (params) => {
      console.log("[Tool:createLead] Executing with params:", params);
      try {
        const lead = await prisma.lead.create({
          data: {
            orgId,
            ...params,
            status: "NEW",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "LEAD",
          recordId: lead.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: lead as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        console.log("[Tool:createLead] Success, created lead:", lead.id);
        
        // Revalidate caches so UI updates immediately
        revalidateLeadCaches();
        
        return {
          success: true,
          leadId: lead.id,
          message: `Successfully created lead: ${lead.firstName} ${lead.lastName}${lead.company ? ` at ${lead.company}` : ""}`,
        };
      } catch (error) {
        console.error("[Tool:createLead] Error:", error);
        return {
          success: false,
          message: `Failed to create lead: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

export const searchLeadsTool = (orgId: string) =>
  tool({
    description: "Search for leads in the CRM. Use this to find existing leads by name, email, company, or status.",
    parameters: z.object({
      query: z.string().optional().describe("Search term to match against name, email, or company"),
      status: z
        .enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"])
        .optional()
        .describe("Filter by lead status"),
      limit: z.number().min(1).max(20).default(5).describe("Maximum number of results to return"),
    }),
    execute: async ({ query, status, limit }) => {
      console.log("[Tool:searchLeads] Executing with:", { query, status, limit });
      try {
        const where: Record<string, unknown> = { orgId };

        if (status) where.status = status;
        if (query) {
          where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
          ];
        }

        const leads = await prisma.lead.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            status: true,
            createdAt: true,
          },
        });

        console.log("[Tool:searchLeads] Found", leads.length, "leads");
        return {
          success: true,
          count: leads.length,
          leads: leads.map((l) => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            email: l.email,
            company: l.company,
            status: l.status,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchLeads] Error:", error);
        return {
          success: false,
          count: 0,
          leads: [],
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });

export const updateLeadTool = (orgId: string, userId: string) =>
  tool({
    description: "Update an existing lead's information",
    parameters: z.object({
      leadId: z.string().uuid().describe("The lead ID to update"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
    }),
    execute: async ({ leadId, ...updates }) => {
      console.log("[Tool:updateLead] Executing:", leadId, updates);
      try {
        const existing = await prisma.lead.findFirst({
          where: { id: leadId, orgId },
        });

        if (!existing) {
          return { success: false, message: "Lead not found" };
        }

        const lead = await prisma.lead.update({
          where: { id: leadId },
          data: updates,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "LEAD",
          recordId: lead.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: lead as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        // Revalidate caches
        revalidateLeadCaches();
        
        return {
          success: true,
          message: `Updated lead: ${lead.firstName} ${lead.lastName}`,
        };
      } catch (error) {
        console.error("[Tool:updateLead] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

// =============================================================================
// CONTACT TOOLS
// =============================================================================

export const createContactTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new contact in the CRM",
    parameters: z.object({
      firstName: z.string().describe("Contact's first name (required)"),
      lastName: z.string().describe("Contact's last name (required)"),
      email: z.string().email().optional().describe("Contact's email"),
      phone: z.string().optional().describe("Contact's phone"),
      title: z.string().optional().describe("Job title"),
      department: z.string().optional().describe("Department"),
      accountId: z.string().uuid().optional().describe("Associated account ID"),
    }),
    execute: async (params) => {
      console.log("[Tool:createContact] Executing:", params);
      try {
        if (params.accountId) {
          const account = await prisma.account.findFirst({
            where: { id: params.accountId, orgId },
          });
          if (!account) {
            return { success: false, message: "Account not found" };
          }
        }

        const contact = await prisma.contact.create({
          data: { orgId, ...params },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CONTACT",
          recordId: contact.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: contact as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        // Revalidate caches
        revalidateContactCaches();
        
        return {
          success: true,
          contactId: contact.id,
          message: `Created contact: ${contact.firstName} ${contact.lastName}`,
        };
      } catch (error) {
        console.error("[Tool:createContact] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchContactsTool = (orgId: string) =>
  tool({
    description: "Search for contacts",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      accountId: z.string().uuid().optional().describe("Filter by account"),
      limit: z.number().min(1).max(20).default(5),
    }),
    execute: async ({ query, accountId, limit }) => {
      console.log("[Tool:searchContacts] Executing:", { query, accountId, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (accountId) where.accountId = accountId;
        if (query) {
          where.OR = [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ];
        }

        const contacts = await prisma.contact.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { account: { select: { name: true } } },
        });

        return {
          success: true,
          count: contacts.length,
          contacts: contacts.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            title: c.title,
            account: c.account?.name,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchContacts] Error:", error);
        return { success: false, count: 0, contacts: [] };
      }
    },
  });

// =============================================================================
// ACCOUNT TOOLS
// =============================================================================

export const createAccountTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new account (company/organization) in the CRM",
    parameters: z.object({
      name: z.string().describe("Company name (required)"),
      industry: z.string().optional().describe("Industry"),
      website: z.string().url().optional().describe("Website URL"),
      phone: z.string().optional().describe("Phone number"),
      type: z.enum(["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"]).optional(),
      rating: z.enum(["HOT", "WARM", "COLD"]).optional(),
    }),
    execute: async (params) => {
      console.log("[Tool:createAccount] Executing:", params);
      try {
        const account = await prisma.account.create({
          data: { orgId, ...params },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "ACCOUNT",
          recordId: account.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: account as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        // Revalidate caches
        revalidateAccountCaches();
        
        return {
          success: true,
          accountId: account.id,
          message: `Created account: ${account.name}`,
        };
      } catch (error) {
        console.error("[Tool:createAccount] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchAccountsTool = (orgId: string) =>
  tool({
    description: "Search for accounts/companies",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      type: z.enum(["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"]).optional(),
      limit: z.number().min(1).max(20).default(5),
    }),
    execute: async ({ query, type, limit }) => {
      console.log("[Tool:searchAccounts] Executing:", { query, type, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (type) where.type = type;
        if (query) {
          where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
          ];
        }

        const accounts = await prisma.account.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { contacts: true, opportunities: true } } },
        });

        return {
          success: true,
          count: accounts.length,
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            industry: a.industry,
            type: a.type,
            contactCount: a._count.contacts,
            opportunityCount: a._count.opportunities,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchAccounts] Error:", error);
        return { success: false, count: 0, accounts: [] };
      }
    },
  });

// =============================================================================
// TASK TOOLS
// =============================================================================

export const createTaskTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new task",
    parameters: z.object({
      title: z.string().describe("Task title (required)"),
      description: z.string().optional().describe("Task description"),
      dueDate: z.string().optional().describe("Due date (e.g., 'tomorrow', 'next week', or ISO date)"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      taskType: z.enum(["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "OTHER"]).optional(),
      leadId: z.string().uuid().optional().describe("Related lead ID"),
      contactId: z.string().uuid().optional().describe("Related contact ID"),
      accountId: z.string().uuid().optional().describe("Related account ID"),
      opportunityId: z.string().uuid().optional().describe("Related opportunity ID"),
    }),
    execute: async (params) => {
      console.log("[Tool:createTask] Executing:", params);
      try {
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
            priority: params.priority,
            taskType: params.taskType,
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
          metadata: { source: "ai_assistant" },
        });

        // Revalidate caches
        revalidateTaskCaches();
        
        return {
          success: true,
          taskId: task.id,
          message: `Created task: "${task.title}"${dueDate ? ` due ${dueDate.toLocaleDateString()}` : ""}`,
        };
      } catch (error) {
        console.error("[Tool:createTask] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const completeTaskTool = (orgId: string, userId: string) =>
  tool({
    description: "Mark a task as completed",
    parameters: z.object({
      taskId: z.string().uuid().describe("The task ID to complete"),
    }),
    execute: async ({ taskId }) => {
      console.log("[Tool:completeTask] Executing:", taskId);
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

        // Revalidate caches
        revalidateTaskCaches();
        
        return { success: true, message: `Completed task: "${task.title}"` };
      } catch (error) {
        console.error("[Tool:completeTask] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchTasksTool = (orgId: string) =>
  tool({
    description: "Search for tasks",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      limit: z.number().min(1).max(20).default(5),
    }),
    execute: async ({ query, status, priority, limit }) => {
      console.log("[Tool:searchTasks] Executing:", { query, status, priority, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
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
            dueDate: t.dueDate?.toISOString(),
          })),
        };
      } catch (error) {
        console.error("[Tool:searchTasks] Error:", error);
        return { success: false, count: 0, tasks: [] };
      }
    },
  });

// =============================================================================
// OPPORTUNITY TOOLS
// =============================================================================

export const createOpportunityTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new sales opportunity. Requires an existing account.",
    parameters: z.object({
      name: z.string().describe("Opportunity name (required)"),
      value: z.number().positive().describe("Deal value in dollars (required)"),
      accountId: z.string().uuid().describe("Associated account ID (required)"),
      stageId: z.string().uuid().optional().describe("Pipeline stage ID"),
      expectedCloseDate: z.string().optional().describe("Expected close date"),
      probability: z.number().min(0).max(100).optional().describe("Win probability %"),
    }),
    execute: async (params) => {
      console.log("[Tool:createOpportunity] Executing:", params);
      try {
        const account = await prisma.account.findFirst({
          where: { id: params.accountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found. Please create an account first." };
        }

        let stageId = params.stageId;
        if (!stageId) {
          const defaultStage = await prisma.pipelineStage.findFirst({
            where: { orgId, module: "OPPORTUNITY", isWon: false, isLost: false },
            orderBy: { order: "asc" },
          });
          if (!defaultStage) {
            return { success: false, message: "No pipeline stages configured" };
          }
          stageId = defaultStage.id;
        }

        const opportunity = await prisma.opportunity.create({
          data: {
            orgId,
            name: params.name,
            value: params.value,
            accountId: params.accountId,
            stageId,
            expectedCloseDate: params.expectedCloseDate ? new Date(params.expectedCloseDate) : null,
            probability: params.probability || 50,
          },
          include: {
            account: { select: { name: true } },
            stage: { select: { name: true } },
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "OPPORTUNITY",
          recordId: opportunity.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: opportunity as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        // Revalidate caches
        revalidateOpportunityCaches();
        
        return {
          success: true,
          opportunityId: opportunity.id,
          message: `Created opportunity: "${opportunity.name}" worth ${params.value.toLocaleString()} with ${opportunity.account.name}`,
        };
      } catch (error) {
        console.error("[Tool:createOpportunity] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchOpportunitiesTool = (orgId: string) =>
  tool({
    description: "Search for sales opportunities",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      accountId: z.string().uuid().optional().describe("Filter by account"),
      minValue: z.number().optional().describe("Minimum deal value"),
      maxValue: z.number().optional().describe("Maximum deal value"),
      limit: z.number().min(1).max(20).default(5),
    }),
    execute: async ({ query, accountId, minValue, maxValue, limit }) => {
      console.log("[Tool:searchOpportunities] Executing:", { query, accountId, minValue, maxValue, limit });
      try {
        const where: Record<string, unknown> = { orgId, closedWon: null };
        if (accountId) where.accountId = accountId;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }
        if (minValue || maxValue) {
          where.value = {};
          if (minValue) (where.value as Record<string, number>).gte = minValue;
          if (maxValue) (where.value as Record<string, number>).lte = maxValue;
        }

        const opportunities = await prisma.opportunity.findMany({
          where,
          take: limit,
          orderBy: { value: "desc" },
          include: {
            account: { select: { name: true } },
            stage: { select: { name: true } },
          },
        });

        return {
          success: true,
          count: opportunities.length,
          totalValue: opportunities.reduce((sum, o) => sum + Number(o.value), 0),
          opportunities: opportunities.map((o) => ({
            id: o.id,
            name: o.name,
            value: Number(o.value),
            account: o.account.name,
            stage: o.stage.name,
            probability: o.probability,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchOpportunities] Error:", error);
        return { success: false, count: 0, totalValue: 0, opportunities: [] };
      }
    },
  });

// =============================================================================
// NOTE TOOLS
// =============================================================================

export const createNoteTool = (orgId: string, userId: string) =>
  tool({
    description: "Add a note to a lead, contact, account, or opportunity",
    parameters: z.object({
      content: z.string().describe("Note content"),
      leadId: z.string().uuid().optional(),
      contactId: z.string().uuid().optional(),
      accountId: z.string().uuid().optional(),
      opportunityId: z.string().uuid().optional(),
    }),
    execute: async (params) => {
      console.log("[Tool:createNote] Executing:", params);
      try {
        if (!params.leadId && !params.contactId && !params.accountId && !params.opportunityId) {
          return { success: false, message: "Must specify a record to attach the note to" };
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
        console.error("[Tool:createNote] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

// =============================================================================
// DASHBOARD/STATS TOOLS
// =============================================================================

export const getDashboardStatsTool = (orgId: string) =>
  tool({
    description: "Get CRM dashboard statistics including leads, contacts, accounts, and pipeline value",
    parameters: z.object({}),
    execute: async () => {
      console.log("[Tool:getDashboardStats] Executing");
      try {
        const [totalLeads, totalContacts, totalAccounts, openOpportunities, pendingTasks] =
          await prisma.$transaction([
            prisma.lead.count({ where: { orgId } }),
            prisma.contact.count({ where: { orgId } }),
            prisma.account.count({ where: { orgId } }),
            prisma.opportunity.aggregate({
              where: { orgId, closedWon: null },
              _count: true,
              _sum: { value: true },
            }),
            prisma.task.count({
              where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
            }),
          ]);

        return {
          success: true,
          stats: {
            leads: totalLeads,
            contacts: totalContacts,
            accounts: totalAccounts,
            openOpportunities: openOpportunities._count,
            pipelineValue: Number(openOpportunities._sum.value || 0),
            pendingTasks,
          },
        };
      } catch (error) {
        console.error("[Tool:getDashboardStats] Error:", error);
        return { success: false, stats: null };
      }
    },
  });

// =============================================================================
// SEMANTIC SEARCH TOOL
// =============================================================================

export const semanticSearchTool = (orgId: string) =>
  tool({
    description: "Search across all CRM data using natural language. Use this for finding information when you're not sure of exact names or want to find related records.",
    parameters: z.object({
      query: z.string().describe("Natural language search query"),
      entityTypes: z.array(z.enum(["LEAD", "CONTACT", "ACCOUNT", "NOTE"])).optional()
        .describe("Limit search to specific entity types"),
      limit: z.number().min(1).max(20).default(5).describe("Maximum results"),
    }),
    execute: async ({ query, entityTypes, limit }) => {
      console.log("[Tool:semanticSearch] Executing:", { query, entityTypes, limit });
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
          results: enrichedResults.filter(r => r.details),
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

// =============================================================================
// DOCUMENT TOOLS
// =============================================================================

export const searchDocumentsTool = (orgId: string) =>
  tool({
    description: "Search for documents in the CRM. Use this to find uploaded files like contracts, proposals, invoices, etc.",
    parameters: z.object({
      query: z.string().optional().describe("Search term to match document name"),
      type: z.enum(["CONTRACT", "PROPOSAL", "INVOICE", "PRESENTATION", "OTHER"]).optional()
        .describe("Filter by document type"),
      leadId: z.string().uuid().optional().describe("Filter by associated lead"),
      accountId: z.string().uuid().optional().describe("Filter by associated account"),
      limit: z.number().min(1).max(20).default(10).describe("Maximum results"),
    }),
    execute: async ({ query, type, leadId, accountId, limit }) => {
      console.log("[Tool:searchDocuments] Executing:", { query, type, leadId, accountId, limit });
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
            uploadedAt: d.createdAt.toISOString(),
            linkedTo: d.lead
              ? `Lead: ${d.lead.firstName} ${d.lead.lastName}`
              : d.account
              ? `Account: ${d.account.name}`
              : null,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchDocuments] Error:", error);
        return { success: false, count: 0, documents: [] };
      }
    },
  });

export const getDocumentStatsTool = (orgId: string) =>
  tool({
    description: "Get statistics about documents - count by type, total storage used, etc.",
    parameters: z.object({}),
    execute: async () => {
      console.log("[Tool:getDocumentStats] Executing");
      try {
        const [totalCount, byType, totalSize, recentDocs] = await Promise.all([
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
          prisma.document.findMany({
            where: { orgId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { name: true, type: true, createdAt: true },
          }),
        ]);

        const typeBreakdown = byType.reduce((acc, { type, _count }) => {
          acc[type] = _count;
          return acc;
        }, {} as Record<string, number>);

        return {
          success: true,
          stats: {
            totalDocuments: totalCount,
            totalStorageUsed: `${((totalSize._sum.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB`,
            byType: typeBreakdown,
            recentDocuments: recentDocs.map((d) => ({
              name: d.name,
              type: d.type,
              uploadedAt: d.createdAt.toISOString(),
            })),
          },
        };
      } catch (error) {
        console.error("[Tool:getDocumentStats] Error:", error);
        return { success: false, stats: null };
      }
    },
  });

export const analyzeDocumentTool = (orgId: string) =>
  tool({
    description: "Get details about a specific document for analysis. Returns document metadata and URL.",
    parameters: z.object({
      documentId: z.string().uuid().optional().describe("Document ID if known"),
      documentName: z.string().optional().describe("Document name to search for"),
    }),
    execute: async ({ documentId, documentName }) => {
      console.log("[Tool:analyzeDocument] Executing:", { documentId, documentName });
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
          return {
            success: false,
            message: "Document not found. Try searching for documents first.",
          };
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
            uploadedAt: document.createdAt.toISOString(),
            linkedTo: document.lead
              ? {
                  type: "Lead",
                  name: `${document.lead.firstName} ${document.lead.lastName}`,
                  email: document.lead.email,
                }
              : document.account
              ? {
                  type: "Account",
                  name: document.account.name,
                  industry: document.account.industry,
                }
              : null,
          },
          note: "To analyze the document content, the user would need to open the URL. Currently, content extraction is not available.",
        };
      } catch (error) {
        console.error("[Tool:analyzeDocument] Error:", error);
        return { success: false, message: "Failed to retrieve document" };
      }
    },
  });

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseNaturalDate(input: string): Date | null {
  const lower = input.toLowerCase().trim();
  const now = new Date();

  if (lower === "today") {
    return now;
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (lower === "next week") {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }
  if (lower.startsWith("in ")) {
    const match = lower.match(/in (\d+) (day|days|week|weeks)/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].startsWith("week") ? 7 : 1;
      const future = new Date(now);
      future.setDate(future.getDate() + amount * unit);
      return future;
    }
  }

  return null;
}

// =============================================================================
// COMPOSIO INTEGRATION TOOLS
// =============================================================================

/**
 * Get list of connected integrations
 */
export const getConnectedIntegrationsTool = (orgId: string) =>
  tool({
    description: "Get list of connected external integrations like Gmail, Calendar, Slack, etc.",
    parameters: z.object({}),
    execute: async () => {
      console.log("[Tool:getConnectedIntegrations] Executing");
      try {
        const connections = await getActiveConnections(orgId);
        const connectedApps = FEATURED_APPS.filter((app) =>
          connections.includes(app.key)
        );

        return {
          success: true,
          connectedApps: connectedApps.map((app) => ({
            key: app.key,
            name: app.name,
            category: app.category,
          })),
          message: connections.length > 0
            ? `You have ${connections.length} connected apps: ${connectedApps.map(a => a.name).join(", ")}`
            : "No external apps connected. Connect apps in Settings > Integrations.",
        };
      } catch (error) {
        console.error("[Tool:getConnectedIntegrations] Error:", error);
        return {
          success: false,
          connectedApps: [],
          message: "Failed to fetch connected integrations",
        };
      }
    },
  });

/**
 * Send an email via Gmail (requires Gmail connection)
 */
export const sendEmailTool = (orgId: string) =>
  tool({
    description: "Send an email via Gmail. Requires Gmail to be connected in Settings > Integrations.",
    parameters: z.object({
      to: z.string().email().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body (plain text or HTML)"),
      cc: z.string().email().optional().describe("CC recipient"),
    }),
    execute: async ({ to, subject, body, cc }) => {
      console.log("[Tool:sendEmail] Executing:", { to, subject });
      try {
        const result = await executeComposioToolDirect(
          "composio_gmail_send_email",
          { to, subject, body, cc },
          orgId
        );

        if (result.success) {
          return {
            success: true,
            message: `Email sent successfully to ${to}`,
          };
        } else {
          return {
            success: false,
            message: result.content || "Failed to send email",
          };
        }
      } catch (error) {
        console.error("[Tool:sendEmail] Error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to send email",
        };
      }
    },
  });

/**
 * Create a calendar event (requires Google Calendar connection)
 */
export const createCalendarEventTool = (orgId: string) =>
  tool({
    description: "Create a Google Calendar event. Requires Google Calendar to be connected.",
    parameters: z.object({
      title: z.string().describe("Event title"),
      description: z.string().optional().describe("Event description"),
      startTime: z.string().describe("Start time (ISO format or natural language like 'tomorrow at 2pm')"),
      endTime: z.string().optional().describe("End time (ISO format or natural language)"),
      attendees: z.array(z.string().email()).optional().describe("List of attendee emails"),
      location: z.string().optional().describe("Event location"),
    }),
    execute: async ({ title, description, startTime, endTime, attendees, location }) => {
      console.log("[Tool:createCalendarEvent] Executing:", { title, startTime });
      try {
        const result = await executeComposioToolDirect(
          "composio_googlecalendar_create_event",
          { 
            summary: title, 
            description, 
            start: { dateTime: startTime },
            end: endTime ? { dateTime: endTime } : undefined,
            attendees: attendees?.map(email => ({ email })),
            location,
          },
          orgId
        );

        if (result.success) {
          return {
            success: true,
            message: `Calendar event "${title}" created successfully`,
            data: result.data,
          };
        } else {
          return {
            success: false,
            message: result.content || "Failed to create calendar event",
          };
        }
      } catch (error) {
        console.error("[Tool:createCalendarEvent] Error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create event",
        };
      }
    },
  });

/**
 * Send a Slack message (requires Slack connection)
 */
export const sendSlackMessageTool = (orgId: string) =>
  tool({
    description: "Send a message to a Slack channel or user. Requires Slack to be connected.",
    parameters: z.object({
      channel: z.string().describe("Channel name (e.g., #general) or user ID"),
      message: z.string().describe("Message text"),
    }),
    execute: async ({ channel, message }) => {
      console.log("[Tool:sendSlackMessage] Executing:", { channel });
      try {
        const result = await executeComposioToolDirect(
          "composio_slack_send_message",
          { channel, text: message },
          orgId
        );

        if (result.success) {
          return {
            success: true,
            message: `Message sent to ${channel}`,
          };
        } else {
          return {
            success: false,
            message: result.content || "Failed to send Slack message",
          };
        }
      } catch (error) {
        console.error("[Tool:sendSlackMessage] Error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to send message",
        };
      }
    },
  });

/**
 * Create a GitHub issue (requires GitHub connection)
 */
export const createGitHubIssueTool = (orgId: string) =>
  tool({
    description: "Create a GitHub issue in a repository. Requires GitHub to be connected.",
    parameters: z.object({
      repo: z.string().describe("Repository name (e.g., 'owner/repo')"),
      title: z.string().describe("Issue title"),
      body: z.string().optional().describe("Issue description"),
      labels: z.array(z.string()).optional().describe("Labels to add"),
    }),
    execute: async ({ repo, title, body, labels }) => {
      console.log("[Tool:createGitHubIssue] Executing:", { repo, title });
      try {
        const [owner, repoName] = repo.split("/");
        const result = await executeComposioToolDirect(
          "composio_github_create_issue",
          { owner, repo: repoName, title, body, labels },
          orgId
        );

        if (result.success) {
          return {
            success: true,
            message: `GitHub issue "${title}" created in ${repo}`,
            data: result.data,
          };
        } else {
          return {
            success: false,
            message: result.content || "Failed to create GitHub issue",
          };
        }
      } catch (error) {
        console.error("[Tool:createGitHubIssue] Error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create issue",
        };
      }
    },
  });

/**
 * Execute any Composio tool dynamically
 */
export const executeExternalToolTool = (orgId: string) =>
  tool({
    description: "Execute any external tool via Composio. Use this for advanced integrations.",
    parameters: z.object({
      toolName: z.string().describe("Full tool name (e.g., 'composio_gmail_send_email')"),
      arguments: z.record(z.unknown()).describe("Tool arguments as key-value pairs"),
    }),
    execute: async ({ toolName, arguments: args }) => {
      console.log("[Tool:executeExternalTool] Executing:", { toolName });
      try {
        const result = await executeComposioToolDirect(
          toolName,
          args as Record<string, unknown>,
          orgId
        );

        return {
          success: result.success,
          message: result.content,
          data: result.data,
        };
      } catch (error) {
        console.error("[Tool:executeExternalTool] Error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to execute tool",
        };
      }
    },
  });
