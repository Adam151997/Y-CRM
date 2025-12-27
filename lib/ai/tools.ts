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
  revalidateTicketCaches,
  revalidateHealthCaches,
  revalidatePlaybookCaches,
  revalidateCampaignCaches,
  revalidateSegmentCaches,
  revalidateFormCaches,
  revalidateCustomModuleCaches,
} from "@/lib/cache-utils";
import { resolveUser } from "@/lib/user-resolver";

/**
 * AI Tools for Y-CRM
 * These tools allow the AI to interact with CRM data across all workspaces
 */

// =============================================================================
// LEAD TOOLS (Sales)
// =============================================================================

export const createLeadTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new lead in the CRM. Use this when the user wants to add a new lead or prospect. Can optionally assign to a team member.",
    parameters: z.object({
      firstName: z.string().describe("Lead's first name (required)"),
      lastName: z.string().describe("Lead's last name (required)"),
      email: z.string().optional().describe("Lead's email address"),
      phone: z.string().optional().describe("Lead's phone number"),
      company: z.string().optional().describe("Company name"),
      title: z.string().optional().describe("Job title"),
      source: z.string().optional().describe("Lead source: REFERRAL, WEBSITE, COLD_CALL, LINKEDIN, TRADE_SHOW, ADVERTISEMENT, EMAIL_CAMPAIGN, or OTHER"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me' (e.g., 'Mike', 'sarah@company.com', 'me')"),
    }),
    execute: async (params) => {
      console.log("[Tool:createLead] ===================");
      console.log("[Tool:createLead] Executing with params:", JSON.stringify(params));
      console.log("[Tool:createLead] OrgId:", orgId);
      console.log("[Tool:createLead] UserId:", userId);
      try {
        // Check for duplicate lead created in last 60 seconds
        const recentDuplicate = await prisma.lead.findFirst({
          where: {
            orgId,
            firstName: { equals: params.firstName, mode: "insensitive" },
            lastName: { equals: params.lastName, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createLead] Duplicate detected, returning existing lead:", recentDuplicate.id);
          return {
            success: true,
            leadId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Lead "${recentDuplicate.firstName} ${recentDuplicate.lastName}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
            console.log("[Tool:createLead] Resolved assignee:", assignedToName);
          } else {
            console.log("[Tool:createLead] Could not resolve assignee:", params.assignTo);
          }
        }

        const { assignTo, ...leadData } = params;
        const lead = await prisma.lead.create({
          data: {
            orgId,
            ...leadData,
            status: "NEW",
            assignedToId,
          },
        });

        console.log("[Tool:createLead] Prisma create SUCCESS");
        console.log("[Tool:createLead] Created lead ID:", lead.id);
        console.log("[Tool:createLead] Created lead orgId:", lead.orgId);

        // Verify the lead was actually created
        const verification = await prisma.lead.findUnique({
          where: { id: lead.id },
        });
        console.log("[Tool:createLead] Verification:", verification ? "FOUND" : "NOT FOUND");
        if (!verification) {
          console.error("[Tool:createLead] CRITICAL: Lead not found immediately after creation!");
        }

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
        
        revalidateLeadCaches();
        
        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          leadId: lead.id,
          assignedToId,
          assignedToName,
          message: `Created lead "${lead.firstName} ${lead.lastName}"${lead.company ? ` at ${lead.company}` : ""} (ID: ${lead.id}).${assignmentMsg}`,
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
      status: z.string().optional().describe("Filter by lead status: NEW, CONTACTED, QUALIFIED, CONVERTED, or LOST"),
      limit: z.number().optional().describe("Maximum number of results to return (1-20, default 5)"),
    }),
    execute: async ({ query, status, limit = 5 }) => {
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
      leadId: z.string().describe("The lead ID (UUID) to update"),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional().describe("Lead status: NEW, CONTACTED, QUALIFIED, CONVERTED, or LOST"),
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
// CONTACT TOOLS (Sales)
// =============================================================================

export const createContactTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new contact in the CRM. Can optionally assign to a team member.",
    parameters: z.object({
      firstName: z.string().describe("Contact's first name (required)"),
      lastName: z.string().describe("Contact's last name (required)"),
      email: z.string().optional().describe("Contact's email"),
      phone: z.string().optional().describe("Contact's phone"),
      title: z.string().optional().describe("Job title"),
      department: z.string().optional().describe("Department"),
      accountId: z.string().optional().describe("Associated account ID (UUID)"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
    }),
    execute: async (params) => {
      console.log("[Tool:createContact] Executing:", params);
      try {
        // Check for duplicate contact created in last 60 seconds
        const recentDuplicate = await prisma.contact.findFirst({
          where: {
            orgId,
            firstName: { equals: params.firstName, mode: "insensitive" },
            lastName: { equals: params.lastName, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createContact] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            contactId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Contact "${recentDuplicate.firstName} ${recentDuplicate.lastName}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        if (params.accountId) {
          const account = await prisma.account.findFirst({
            where: { id: params.accountId, orgId },
          });
          if (!account) {
            return { success: false, message: "Account not found" };
          }
        }

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
          }
        }

        const { assignTo, ...contactData } = params;
        const contact = await prisma.contact.create({
          data: { orgId, ...contactData, assignedToId },
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

        revalidateContactCaches();
        
        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          contactId: contact.id,
          assignedToId,
          assignedToName,
          message: `Created contact "${contact.firstName} ${contact.lastName}" (ID: ${contact.id}).${assignmentMsg}`,
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
      accountId: z.string().optional().describe("Filter by account ID (UUID)"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, accountId, limit = 5 }) => {
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
// ACCOUNT TOOLS (Sales & CS)
// =============================================================================

export const createAccountTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new account (company/organization) in the CRM. Can optionally assign to a team member.",
    parameters: z.object({
      name: z.string().describe("Company name (required)"),
      industry: z.string().optional().describe("Industry"),
      website: z.string().optional().describe("Website URL"),
      phone: z.string().optional().describe("Phone number"),
      type: z.string().optional().describe("Account type: PROSPECT, CUSTOMER, PARTNER, or VENDOR"),
      rating: z.string().optional().describe("Account rating: HOT, WARM, or COLD"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
    }),
    execute: async (params) => {
      console.log("[Tool:createAccount] Executing:", params);
      try {
        // Check for duplicate account created in last 60 seconds
        const recentDuplicate = await prisma.account.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createAccount] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            accountId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Account "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
          }
        }

        const { assignTo, ...accountData } = params;
        const account = await prisma.account.create({
          data: { 
            orgId, 
            name: accountData.name,
            industry: accountData.industry,
            website: accountData.website,
            phone: accountData.phone,
            type: accountData.type as "PROSPECT" | "CUSTOMER" | "PARTNER" | "VENDOR" | undefined,
            rating: accountData.rating as "HOT" | "WARM" | "COLD" | undefined,
            assignedToId 
          },
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

        revalidateAccountCaches();
        
        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          accountId: account.id,
          assignedToId,
          assignedToName,
          message: `Created account "${account.name}" (ID: ${account.id}).${assignmentMsg}`,
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
      type: z.string().optional().describe("Filter by type: PROSPECT, CUSTOMER, PARTNER, or VENDOR"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, type, limit = 5 }) => {
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
// TASK TOOLS (All Workspaces)
// =============================================================================

export const createTaskTool = (orgId: string, userId: string) =>
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
      console.log("[Tool:createTask] Executing:", params);
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
        console.error("[Tool:createTask] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const completeTaskTool = (orgId: string, userId: string) =>
  tool({
    description: "Mark a task as completed",
    parameters: z.object({
      taskId: z.string().describe("The task ID (UUID) to complete"),
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
    description: "Search for tasks across all workspaces",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      status: z.string().optional().describe("Filter by status: PENDING, IN_PROGRESS, COMPLETED, or CANCELLED"),
      priority: z.string().optional().describe("Filter by priority: LOW, MEDIUM, HIGH, or URGENT"),
      workspace: z.string().optional().describe("Filter by workspace: sales, cs, or marketing"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, status, priority, workspace, limit = 5 }) => {
      console.log("[Tool:searchTasks] Executing:", { query, status, priority, workspace, limit });
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
        console.error("[Tool:searchTasks] Error:", error);
        return { success: false, count: 0, tasks: [] };
      }
    },
  });

// =============================================================================
// OPPORTUNITY TOOLS (Sales)
// =============================================================================

export const createOpportunityTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new sales opportunity. Requires an existing account. Can optionally assign to a team member.",
    parameters: z.object({
      name: z.string().describe("Opportunity name (required)"),
      value: z.number().describe("Deal value in dollars (required, must be positive)"),
      accountId: z.string().describe("Associated account ID (UUID, required)"),
      stageId: z.string().optional().describe("Pipeline stage ID (UUID)"),
      expectedCloseDate: z.string().optional().describe("Expected close date (ISO format)"),
      probability: z.number().optional().describe("Win probability % (0-100)"),
      assignTo: z.string().optional().describe("Assign to team member by name, email, or 'me'"),
    }),
    execute: async (params) => {
      console.log("[Tool:createOpportunity] Executing:", params);
      try {
        // Check for duplicate opportunity created in last 60 seconds
        const recentDuplicate = await prisma.opportunity.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            accountId: params.accountId,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createOpportunity] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            opportunityId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Opportunity "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

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

        // Resolve assignee if provided
        let assignedToId: string | undefined;
        let assignedToName: string | undefined;
        if (params.assignTo) {
          const resolved = await resolveUser(orgId, params.assignTo, userId);
          if (resolved) {
            assignedToId = resolved.id;
            assignedToName = resolved.name;
          }
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
            assignedToId,
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

        revalidateOpportunityCaches();
        
        const assignmentMsg = assignedToName ? ` Assigned to ${assignedToName}.` : "";
        return {
          success: true,
          opportunityId: opportunity.id,
          assignedToId,
          assignedToName,
          message: `Created opportunity "${opportunity.name}" worth ${params.value.toLocaleString()} with ${opportunity.account.name} (ID: ${opportunity.id}).${assignmentMsg}`,
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
      accountId: z.string().optional().describe("Filter by account ID (UUID)"),
      minValue: z.number().optional().describe("Minimum deal value"),
      maxValue: z.number().optional().describe("Maximum deal value"),
      limit: z.number().optional().describe("Maximum results (1-20, default 5)"),
    }),
    execute: async ({ query, accountId, minValue, maxValue, limit = 5 }) => {
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
// NOTE TOOLS (All Workspaces)
// =============================================================================

export const createNoteTool = (orgId: string, userId: string) =>
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
      console.log("[Tool:createNote] Executing:", params);
      try {
        if (!params.leadId && !params.contactId && !params.accountId && !params.opportunityId) {
          return { 
            success: false, 
            errorCode: "VALIDATION",
            message: "Must specify a record to attach the note to" 
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
    description: "Get CRM dashboard statistics including leads, contacts, accounts, tickets, and pipeline value",
    parameters: z.object({
      workspace: z.string().optional().describe("Get stats for specific workspace: sales, cs, marketing, or all (default)"),
    }),
    execute: async ({ workspace = "all" }) => {
      console.log("[Tool:getDashboardStats] Executing for workspace:", workspace);
      try {
        const stats: Record<string, unknown> = {};

        if (workspace === "all" || workspace === "sales") {
          const [totalLeads, totalContacts, totalAccounts, openOpportunities] =
            await prisma.$transaction([
              prisma.lead.count({ where: { orgId } }),
              prisma.contact.count({ where: { orgId } }),
              prisma.account.count({ where: { orgId } }),
              prisma.opportunity.aggregate({
                where: { orgId, closedWon: null },
                _count: true,
                _sum: { value: true },
              }),
            ]);
          
          stats.sales = {
            leads: totalLeads,
            contacts: totalContacts,
            accounts: totalAccounts,
            openOpportunities: openOpportunities._count,
            pipelineValue: Number(openOpportunities._sum.value || 0),
          };
        }

        if (workspace === "all" || workspace === "cs") {
          const [openTickets, atRiskAccounts] = await prisma.$transaction([
            prisma.ticket.count({ where: { orgId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
            prisma.accountHealth.count({ where: { orgId, isAtRisk: true } }),
          ]);

          stats.cs = {
            openTickets,
            atRiskAccounts,
          };
        }

        if (workspace === "all" || workspace === "marketing") {
          const [activeCampaigns, activeSegments, activeForms] = await prisma.$transaction([
            prisma.campaign.count({ where: { orgId, status: "ACTIVE" } }),
            prisma.segment.count({ where: { orgId, isActive: true } }),
            prisma.form.count({ where: { orgId, isActive: true } }),
          ]);

          stats.marketing = {
            activeCampaigns,
            activeSegments,
            activeForms,
          };
        }

        const pendingTasks = await prisma.task.count({
          where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
        });

        stats.tasks = { pending: pendingTasks };

        return { success: true, stats };
      } catch (error) {
        console.error("[Tool:getDashboardStats] Error:", error);
        return { success: false, stats: null };
      }
    },
  });

// =============================================================================
// CS WORKSPACE TOOLS - TICKETS
// =============================================================================

export const createTicketTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new support ticket in the Customer Success workspace. You can provide either accountId (UUID) or accountName (the tool will search for the account).",
    parameters: z.object({
      subject: z.string().describe("Ticket subject (required)"),
      description: z.string().optional().describe("Ticket description"),
      accountId: z.string().optional().describe("Account ID (UUID) - use if you already have it"),
      accountName: z.string().optional().describe("Account name to search for - use if you don't have the accountId"),
      contactId: z.string().optional().describe("Contact ID (UUID)"),
      priority: z.string().optional().describe("Priority: LOW, MEDIUM (default), HIGH, or URGENT"),
      category: z.string().optional().describe("Category: BUG, BILLING, FEATURE_REQUEST, QUESTION, or GENERAL"),
    }),
    execute: async (params) => {
      console.log("[Tool:createTicket] Executing:", params);
      try {
        // Resolve accountId from accountName if needed
        let resolvedAccountId = params.accountId;
        
        if (!resolvedAccountId && params.accountName) {
          const account = await prisma.account.findFirst({
            where: { 
              orgId, 
              name: { contains: params.accountName, mode: "insensitive" } 
            },
          });
          if (account) {
            resolvedAccountId = account.id;
            console.log("[Tool:createTicket] Resolved account:", account.name, "->", account.id);
          } else {
            return { 
              success: false,
              errorCode: "NOT_FOUND",
              message: `Account "${params.accountName}" not found. Please create the account first or check the spelling.` 
            };
          }
        }

        if (!resolvedAccountId) {
          return { 
            success: false,
            errorCode: "VALIDATION",
            message: "Either accountId or accountName is required to create a ticket." 
          };
        }

        // Check for duplicate ticket created in last 60 seconds
        const recentDuplicate = await prisma.ticket.findFirst({
          where: {
            orgId,
            subject: { equals: params.subject, mode: "insensitive" },
            accountId: resolvedAccountId,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createTicket] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            ticketId: recentDuplicate.id,
            ticketNumber: recentDuplicate.ticketNumber,
            alreadyExisted: true,
            message: `Ticket #${recentDuplicate.ticketNumber}: "${recentDuplicate.subject}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Verify account exists
        const account = await prisma.account.findFirst({
          where: { id: resolvedAccountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found" };
        }

        const ticket = await prisma.ticket.create({
          data: {
            orgId,
            subject: params.subject,
            description: params.description,
            accountId: resolvedAccountId,
            contactId: params.contactId,
            priority: (params.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
            category: params.category as "BUG" | "BILLING" | "FEATURE_REQUEST" | "QUESTION" | "GENERAL" | undefined,
            status: "NEW",
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "TICKET",
          recordId: ticket.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: ticket as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateTicketCaches();

        return {
          success: true,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          message: `Created ticket #${ticket.ticketNumber}: "${ticket.subject}" for ${account.name} (ID: ${ticket.id})`,
        };
      } catch (error) {
        console.error("[Tool:createTicket] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchTicketsTool = (orgId: string) =>
  tool({
    description: "Search for support tickets",
    parameters: z.object({
      query: z.string().optional().describe("Search term for subject"),
      status: z.string().optional().describe("Filter by status: NEW, OPEN, PENDING, RESOLVED, or CLOSED"),
      priority: z.string().optional().describe("Filter by priority: LOW, MEDIUM, HIGH, or URGENT"),
      accountId: z.string().optional().describe("Filter by account ID (UUID)"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, status, priority, accountId, limit = 10 }) => {
      console.log("[Tool:searchTickets] Executing:", { query, status, priority, accountId, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (accountId) where.accountId = accountId;
        if (query) {
          where.subject = { contains: query, mode: "insensitive" };
        }

        const tickets = await prisma.ticket.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            account: { select: { name: true } },
          },
        });

        return {
          success: true,
          count: tickets.length,
          tickets: tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            account: t.account.name,
            createdAt: t.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        console.error("[Tool:searchTickets] Error:", error);
        return { success: false, count: 0, tickets: [] };
      }
    },
  });

export const updateTicketTool = (orgId: string, userId: string) =>
  tool({
    description: "Update a ticket's status, priority, or assignment",
    parameters: z.object({
      ticketId: z.string().describe("Ticket ID (UUID) to update"),
      status: z.string().optional().describe("New status: NEW, OPEN, PENDING, RESOLVED, or CLOSED"),
      priority: z.string().optional().describe("New priority: LOW, MEDIUM, HIGH, or URGENT"),
      assignedToId: z.string().optional().describe("Assign to user ID"),
      resolution: z.string().optional().describe("Resolution notes (for resolved/closed)"),
    }),
    execute: async ({ ticketId, ...updates }) => {
      console.log("[Tool:updateTicket] Executing:", ticketId, updates);
      try {
        const existing = await prisma.ticket.findFirst({
          where: { id: ticketId, orgId },
        });
        if (!existing) {
          return { success: false, message: "Ticket not found" };
        }

        const updateData: Record<string, unknown> = { ...updates };
        if (updates.status === "RESOLVED" || updates.status === "CLOSED") {
          updateData.resolvedAt = new Date();
          updateData.resolvedById = userId;
        }

        const ticket = await prisma.ticket.update({
          where: { id: ticketId },
          data: updateData,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "TICKET",
          recordId: ticket.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: ticket as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateTicketCaches();

        return {
          success: true,
          message: `Updated ticket #${ticket.ticketNumber}`,
        };
      } catch (error) {
        console.error("[Tool:updateTicket] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const addTicketMessageTool = (orgId: string, userId: string) =>
  tool({
    description: "Add a message or reply to a ticket",
    parameters: z.object({
      ticketId: z.string().describe("Ticket ID (UUID)"),
      content: z.string().describe("Message content"),
      isInternal: z.boolean().optional().describe("Internal note not visible to customer (default: false)"),
    }),
    execute: async ({ ticketId, content, isInternal = false }) => {
      console.log("[Tool:addTicketMessage] Executing:", { ticketId, isInternal });
      try {
        const ticket = await prisma.ticket.findFirst({
          where: { id: ticketId, orgId },
        });
        if (!ticket) {
          return { success: false, message: "Ticket not found" };
        }

        const message = await prisma.ticketMessage.create({
          data: {
            ticketId,
            content,
            isInternal,
            authorId: userId,
            authorType: "AI_AGENT",
            authorName: "AI Assistant",
          },
        });

        // Update ticket status if it's NEW
        if (ticket.status === "NEW") {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "OPEN" },
          });
        }

        revalidateTicketCaches();

        return {
          success: true,
          messageId: message.id,
          message: `Added ${isInternal ? "internal note" : "reply"} to ticket #${ticket.ticketNumber}`,
        };
      } catch (error) {
        console.error("[Tool:addTicketMessage] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

// =============================================================================
// CS WORKSPACE TOOLS - HEALTH SCORES
// =============================================================================

export const getHealthScoreTool = (orgId: string) =>
  tool({
    description: "Get the health score for an account",
    parameters: z.object({
      accountId: z.string().describe("Account ID (UUID)"),
    }),
    execute: async ({ accountId }) => {
      console.log("[Tool:getHealthScore] Executing:", accountId);
      try {
        const health = await prisma.accountHealth.findUnique({
          where: { accountId },
          include: {
            account: { select: { name: true } },
          },
        });

        if (!health) {
          return {
            success: true,
            message: "No health score recorded for this account",
            health: null,
          };
        }

        return {
          success: true,
          health: {
            accountName: health.account.name,
            score: health.score,
            riskLevel: health.riskLevel,
            isAtRisk: health.isAtRisk,
            components: {
              engagement: health.engagementScore,
              support: health.supportScore,
              relationship: health.relationshipScore,
              financial: health.financialScore,
              adoption: health.adoptionScore,
            },
            riskReasons: health.riskReasons,
            lastCalculated: health.calculatedAt.toISOString(),
          },
        };
      } catch (error) {
        console.error("[Tool:getHealthScore] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchAtRiskAccountsTool = (orgId: string) =>
  tool({
    description: "Find accounts that are at risk based on health scores",
    parameters: z.object({
      riskLevel: z.string().optional().describe("Filter by risk level: HIGH or CRITICAL"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ riskLevel, limit = 10 }) => {
      console.log("[Tool:searchAtRiskAccounts] Executing:", { riskLevel, limit });
      try {
        const where: Record<string, unknown> = { orgId, isAtRisk: true };
        if (riskLevel) {
          where.riskLevel = riskLevel;
        } else {
          where.riskLevel = { in: ["HIGH", "CRITICAL"] };
        }

        const healthScores = await prisma.accountHealth.findMany({
          where,
          take: limit,
          orderBy: { score: "asc" },
          include: {
            account: { select: { id: true, name: true } },
          },
        });

        return {
          success: true,
          count: healthScores.length,
          accounts: healthScores.map((h) => ({
            accountId: h.account.id,
            accountName: h.account.name,
            score: h.score,
            riskLevel: h.riskLevel,
            riskReasons: h.riskReasons,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchAtRiskAccounts] Error:", error);
        return { success: false, count: 0, accounts: [] };
      }
    },
  });

// =============================================================================
// CS WORKSPACE TOOLS - PLAYBOOKS
// =============================================================================

export const searchPlaybooksTool = (orgId: string) =>
  tool({
    description: "Search for customer success playbooks",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      trigger: z.string().optional().describe("Filter by trigger: MANUAL, NEW_CUSTOMER, RENEWAL_APPROACHING, HEALTH_DROP, or TICKET_ESCALATION"),
      isActive: z.boolean().optional().describe("Filter by active status (default: true)"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, trigger, isActive = true, limit = 10 }) => {
      console.log("[Tool:searchPlaybooks] Executing:", { query, trigger, isActive, limit });
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
        console.error("[Tool:searchPlaybooks] Error:", error);
        return { success: false, count: 0, playbooks: [] };
      }
    },
  });

export const runPlaybookTool = (orgId: string, userId: string) =>
  tool({
    description: "Start running a playbook for an account",
    parameters: z.object({
      playbookId: z.string().describe("Playbook ID (UUID) to run"),
      accountId: z.string().describe("Account ID (UUID) to run playbook for"),
    }),
    execute: async ({ playbookId, accountId }) => {
      console.log("[Tool:runPlaybook] Executing:", { playbookId, accountId });
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
        console.error("[Tool:runPlaybook] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

// =============================================================================
// MARKETING WORKSPACE TOOLS - CAMPAIGNS
// =============================================================================

export const createCampaignTool = (orgId: string, userId: string) =>
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
      console.log("[Tool:createCampaign] Executing:", params);
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
        console.error("[Tool:createCampaign] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchCampaignsTool = (orgId: string) =>
  tool({
    description: "Search for marketing campaigns",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      status: z.string().optional().describe("Filter by status: DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, or CANCELLED"),
      type: z.string().optional().describe("Filter by type: EMAIL, SOCIAL, EVENT, WEBINAR, SMS, or ADS"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, status, type, limit = 10 }) => {
      console.log("[Tool:searchCampaigns] Executing:", { query, status, type, limit });
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
        console.error("[Tool:searchCampaigns] Error:", error);
        return { success: false, count: 0, campaigns: [] };
      }
    },
  });

// =============================================================================
// MARKETING WORKSPACE TOOLS - SEGMENTS
// =============================================================================

export const createSegmentTool = (orgId: string, userId: string) =>
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
      console.log("[Tool:createSegment] Executing:", params);
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
        console.error("[Tool:createSegment] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchSegmentsTool = (orgId: string) =>
  tool({
    description: "Search for audience segments",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      isActive: z.boolean().optional().describe("Filter by active status"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, isActive, limit = 10 }) => {
      console.log("[Tool:searchSegments] Executing:", { query, isActive, limit });
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
        console.error("[Tool:searchSegments] Error:", error);
        return { success: false, count: 0, segments: [] };
      }
    },
  });

// =============================================================================
// MARKETING WORKSPACE TOOLS - FORMS
// =============================================================================

export const createFormTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new lead capture form. Default fields are Name and Email. Use fieldsJson to customize.",
    parameters: z.object({
      name: z.string().describe("Form name (required)"),
      description: z.string().optional(),
      fieldsJson: z.string().optional().describe("JSON string of fields array, e.g. [{\"type\":\"text\",\"label\":\"Name\",\"required\":true},{\"type\":\"email\",\"label\":\"Email\",\"required\":true}]. Types: text, email, phone, textarea, select, checkbox, number, date"),
      createLead: z.boolean().optional().describe("Automatically create lead from submissions (default: true)"),
    }),
    execute: async (params) => {
      console.log("[Tool:createForm] Executing:", params);
      try {
        // Check for duplicate form created in last 60 seconds
        const recentDuplicate = await prisma.form.findFirst({
          where: {
            orgId,
            name: { equals: params.name, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createForm] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            formId: recentDuplicate.id,
            slug: recentDuplicate.slug,
            alreadyExisted: true,
            message: `Form "${recentDuplicate.name}" already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        // Generate slug from name
        const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        
        // Check slug uniqueness
        const existing = await prisma.form.findFirst({
          where: { orgId, slug },
        });
        
        const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

        // Parse fields from JSON string if provided, otherwise use defaults
        let fields: { type: string; label: string; required?: boolean; placeholder?: string }[] = [
          { type: "text", label: "Full Name", required: true },
          { type: "email", label: "Email", required: true },
        ];
        if (params.fieldsJson) {
          try {
            fields = JSON.parse(params.fieldsJson);
          } catch {
            return { success: false, message: "Invalid fieldsJson format. Expected JSON array." };
          }
        }

        const form = await prisma.form.create({
          data: {
            orgId,
            name: params.name,
            description: params.description,
            fields: fields.map((f, i) => ({ id: `field-${i}`, ...f })),
            createLead: params.createLead ?? true,
            slug: finalSlug,
            isActive: true,
            createdById: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "FORM",
          recordId: form.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: form as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateFormCaches();

        return {
          success: true,
          formId: form.id,
          slug: form.slug,
          message: `Created form "${form.name}" (ID: ${form.id}, slug: ${form.slug})`,
        };
      } catch (error) {
        console.error("[Tool:createForm] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchFormsTool = (orgId: string) =>
  tool({
    description: "Search for lead capture forms",
    parameters: z.object({
      query: z.string().optional().describe("Search term"),
      isActive: z.boolean().optional().describe("Filter by active status"),
      limit: z.number().optional().describe("Maximum results (1-20, default 10)"),
    }),
    execute: async ({ query, isActive, limit = 10 }) => {
      console.log("[Tool:searchForms] Executing:", { query, isActive, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (isActive !== undefined) where.isActive = isActive;
        if (query) {
          where.name = { contains: query, mode: "insensitive" };
        }

        const forms = await prisma.form.findMany({
          where,
          take: limit,
          orderBy: { submissions: "desc" },
        });

        return {
          success: true,
          count: forms.length,
          forms: forms.map((f) => ({
            id: f.id,
            name: f.name,
            slug: f.slug,
            views: f.views,
            submissions: f.submissions,
            conversionRate: f.conversionRate ? Number(f.conversionRate) : null,
            isActive: f.isActive,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchForms] Error:", error);
        return { success: false, count: 0, forms: [] };
      }
    },
  });

// =============================================================================
// CUSTOM MODULE TOOLS
// =============================================================================

export const createCustomModuleTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new custom module (e.g., Products, Projects, Events)",
    parameters: z.object({
      name: z.string().describe("Module name (singular, e.g., 'Product')"),
      pluralName: z.string().describe("Plural name (e.g., 'Products')"),
      description: z.string().optional(),
      icon: z.string().default("box").describe("Lucide icon name"),
    }),
    execute: async (params) => {
      console.log("[Tool:createCustomModule] Executing:", params);
      try {
        const slug = params.pluralName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        
        const existing = await prisma.customModule.findFirst({
          where: { orgId, slug },
        });
        if (existing) {
          return { success: false, message: `Module with slug "${slug}" already exists` };
        }

        const module = await prisma.customModule.create({
          data: {
            orgId,
            name: params.name,
            pluralName: params.pluralName,
            slug,
            description: params.description,
            icon: params.icon,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CUSTOM_MODULE",
          recordId: module.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: module as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateCustomModuleCaches();

        return {
          success: true,
          moduleId: module.id,
          slug: module.slug,
          message: `Created custom module "${module.name}" (ID: ${module.id})`,
        };
      } catch (error) {
        console.error("[Tool:createCustomModule] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const createCustomFieldTool = (orgId: string, userId: string) =>
  tool({
    description: "Add a custom field to a module (built-in like LEAD, CONTACT, or custom module)",
    parameters: z.object({
      module: z.enum(["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"]).optional().describe("Built-in module"),
      customModuleId: z.string().uuid().optional().describe("Custom module ID"),
      fieldName: z.string().describe("Display name (e.g., 'Industry')"),
      fieldKey: z.string().describe("JSON key (e.g., 'industry')"),
      fieldType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "MULTISELECT", "BOOLEAN", "URL", "EMAIL", "PHONE", "TEXTAREA", "CURRENCY", "PERCENT"]),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional().describe("Options for SELECT/MULTISELECT"),
      placeholder: z.string().optional(),
    }),
    execute: async (params) => {
      console.log("[Tool:createCustomField] Executing:", params);
      try {
        if (!params.module && !params.customModuleId) {
          return { success: false, message: "Must specify either module or customModuleId" };
        }

        if (params.customModuleId) {
          const customModule = await prisma.customModule.findFirst({
            where: { id: params.customModuleId, orgId },
          });
          if (!customModule) {
            return { success: false, message: "Custom module not found" };
          }
        }

        const field = await prisma.customFieldDefinition.create({
          data: {
            orgId,
            module: params.module,
            customModuleId: params.customModuleId,
            fieldName: params.fieldName,
            fieldKey: params.fieldKey,
            fieldType: params.fieldType,
            required: params.required,
            options: params.options,
            placeholder: params.placeholder,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "CUSTOM_FIELD",
          recordId: field.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: field as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        revalidateCustomModuleCaches();

        return {
          success: true,
          fieldId: field.id,
          message: `Created custom field "${field.fieldName}" (${field.fieldType})`,
        };
      } catch (error) {
        console.error("[Tool:createCustomField] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const createCustomModuleRecordTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a record in a custom module",
    parameters: z.object({
      moduleId: z.string().uuid().describe("Custom module ID"),
      data: z.record(z.unknown()).describe("Record data as key-value pairs"),
    }),
    execute: async ({ moduleId, data }) => {
      console.log("[Tool:createCustomModuleRecord] Executing:", { moduleId, data });
      try {
        const module = await prisma.customModule.findFirst({
          where: { id: moduleId, orgId },
        });
        if (!module) {
          return { success: false, message: "Custom module not found" };
        }

        const record = await prisma.customModuleRecord.create({
          data: {
            orgId,
            moduleId,
            data: data as unknown as import("@prisma/client").Prisma.InputJsonValue,
            createdById: userId,
            createdByType: "AI_AGENT",
          },
        });

        return {
          success: true,
          recordId: record.id,
          moduleName: module.name,
          message: `Created ${module.name} record (ID: ${record.id})`,
        };
      } catch (error) {
        console.error("[Tool:createCustomModuleRecord] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchCustomModuleRecordsTool = (orgId: string) =>
  tool({
    description: "Search records in a custom module",
    parameters: z.object({
      moduleId: z.string().uuid().describe("Custom module ID"),
      limit: z.number().min(1).max(50).default(10),
    }),
    execute: async ({ moduleId, limit }) => {
      console.log("[Tool:searchCustomModuleRecords] Executing:", { moduleId, limit });
      try {
        const module = await prisma.customModule.findFirst({
          where: { id: moduleId, orgId },
        });
        if (!module) {
          return { success: false, message: "Custom module not found" };
        }

        const records = await prisma.customModuleRecord.findMany({
          where: { moduleId, orgId },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        return {
          success: true,
          moduleName: module.name,
          count: records.length,
          records: records.map((r) => ({
            id: r.id,
            data: r.data,
            createdAt: r.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        console.error("[Tool:searchCustomModuleRecords] Error:", error);
        return { success: false, count: 0, records: [] };
      }
    },
  });

export const listCustomModulesTool = (orgId: string) =>
  tool({
    description: "List all custom modules available in the system",
    parameters: z.object({}),
    execute: async () => {
      console.log("[Tool:listCustomModules] Executing");
      try {
        const modules = await prisma.customModule.findMany({
          where: { orgId, isActive: true },
          orderBy: { displayOrder: "asc" },
          include: {
            _count: { select: { records: true, fields: true } },
          },
        });

        return {
          success: true,
          count: modules.length,
          modules: modules.map((m) => ({
            id: m.id,
            name: m.name,
            pluralName: m.pluralName,
            slug: m.slug,
            icon: m.icon,
            recordCount: m._count.records,
            fieldCount: m._count.fields,
          })),
        };
      } catch (error) {
        console.error("[Tool:listCustomModules] Error:", error);
        return { success: false, count: 0, modules: [] };
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
    description: "Search for documents in the CRM.",
    parameters: z.object({
      query: z.string().optional().describe("Search term to match document name"),
      type: z.enum(["CONTRACT", "PROPOSAL", "INVOICE", "PRESENTATION", "OTHER"]).optional(),
      leadId: z.string().uuid().optional(),
      accountId: z.string().uuid().optional(),
      limit: z.number().min(1).max(20).default(10),
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
    description: "Get statistics about documents",
    parameters: z.object({}),
    execute: async () => {
      console.log("[Tool:getDocumentStats] Executing");
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
        console.error("[Tool:getDocumentStats] Error:", error);
        return { success: false, stats: null };
      }
    },
  });

export const analyzeDocumentTool = (orgId: string) =>
  tool({
    description: "Get details about a specific document",
    parameters: z.object({
      documentId: z.string().uuid().optional(),
      documentName: z.string().optional(),
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
        console.error("[Tool:analyzeDocument] Error:", error);
        return { success: false, message: "Failed to retrieve document" };
      }
    },
  });

// =============================================================================
// CS WORKSPACE TOOLS - RENEWALS
// =============================================================================

export const createRenewalTool = (orgId: string, userId: string) =>
  tool({
    description: "Create a new renewal/contract tracking record for an account",
    parameters: z.object({
      accountId: z.string().uuid().describe("Account ID (required)"),
      contractName: z.string().optional().describe("Contract name"),
      contractValue: z.number().positive().describe("Contract value (required)"),
      currency: z.string().default("USD"),
      startDate: z.string().describe("Contract start date (ISO format)"),
      endDate: z.string().describe("Contract end date (ISO format)"),
      status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).default("UPCOMING"),
      probability: z.number().min(0).max(100).default(50),
      notes: z.string().optional(),
    }),
    execute: async (params) => {
      console.log("[Tool:createRenewal] Executing:", params);
      try {
        // Check for duplicate renewal created in last 60 seconds
        const recentDuplicate = await prisma.renewal.findFirst({
          where: {
            orgId,
            accountId: params.accountId,
            contractName: params.contractName ? { equals: params.contractName, mode: "insensitive" } : undefined,
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });

        if (recentDuplicate) {
          console.log("[Tool:createRenewal] Duplicate detected:", recentDuplicate.id);
          return {
            success: true,
            renewalId: recentDuplicate.id,
            alreadyExisted: true,
            message: `Renewal already exists (ID: ${recentDuplicate.id}). No duplicate created.`,
          };
        }

        const account = await prisma.account.findFirst({
          where: { id: params.accountId, orgId },
        });
        if (!account) {
          return { success: false, message: "Account not found" };
        }

        const renewal = await prisma.renewal.create({
          data: {
            orgId,
            accountId: params.accountId,
            contractName: params.contractName,
            contractValue: params.contractValue,
            currency: params.currency,
            startDate: new Date(params.startDate),
            endDate: new Date(params.endDate),
            status: params.status,
            probability: params.probability,
            notes: params.notes,
            ownerUserId: userId,
          },
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "RENEWAL",
          recordId: renewal.id,
          actorType: "AI_AGENT",
          actorId: userId,
          newState: renewal as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          renewalId: renewal.id,
          message: `Created renewal for ${account.name} worth ${params.contractValue.toLocaleString()} ending ${new Date(params.endDate).toLocaleDateString()} (ID: ${renewal.id})`,
        };
      } catch (error) {
        console.error("[Tool:createRenewal] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const searchRenewalsTool = (orgId: string) =>
  tool({
    description: "Search for contract renewals",
    parameters: z.object({
      accountId: z.string().uuid().optional().describe("Filter by account"),
      status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional(),
      upcomingDays: z.number().optional().describe("Find renewals ending within X days"),
      limit: z.number().min(1).max(20).default(10),
    }),
    execute: async ({ accountId, status, upcomingDays, limit }) => {
      console.log("[Tool:searchRenewals] Executing:", { accountId, status, upcomingDays, limit });
      try {
        const where: Record<string, unknown> = { orgId };
        if (accountId) where.accountId = accountId;
        if (status) where.status = status;
        
        if (upcomingDays) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + upcomingDays);
          where.endDate = {
            gte: new Date(),
            lte: futureDate,
          };
          where.status = { in: ["UPCOMING", "IN_PROGRESS"] };
        }

        const renewals = await prisma.renewal.findMany({
          where,
          take: limit,
          orderBy: { endDate: "asc" },
          include: {
            account: { select: { id: true, name: true } },
          },
        });

        return {
          success: true,
          count: renewals.length,
          renewals: renewals.map((r) => ({
            id: r.id,
            accountName: r.account.name,
            contractName: r.contractName,
            contractValue: Number(r.contractValue),
            currency: r.currency,
            endDate: r.endDate.toISOString(),
            status: r.status,
            probability: r.probability,
          })),
        };
      } catch (error) {
        console.error("[Tool:searchRenewals] Error:", error);
        return { success: false, count: 0, renewals: [] };
      }
    },
  });

export const updateRenewalTool = (orgId: string, userId: string) =>
  tool({
    description: "Update a renewal's status, probability, or other details",
    parameters: z.object({
      renewalId: z.string().uuid().describe("Renewal ID to update"),
      status: z.enum(["UPCOMING", "IN_PROGRESS", "RENEWED", "CHURNED", "DOWNGRADED", "EXPANDED"]).optional(),
      probability: z.number().min(0).max(100).optional(),
      renewalValue: z.number().positive().optional().describe("New contract value if renewed"),
      churnReason: z.string().optional().describe("Reason for churn (if churned)"),
      notes: z.string().optional(),
    }),
    execute: async ({ renewalId, ...updates }) => {
      console.log("[Tool:updateRenewal] Executing:", renewalId, updates);
      try {
        const existing = await prisma.renewal.findFirst({
          where: { id: renewalId, orgId },
          include: { account: { select: { name: true } } },
        });
        if (!existing) {
          return { success: false, message: "Renewal not found" };
        }

        const updateData: Record<string, unknown> = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.probability !== undefined) updateData.probability = updates.probability;
        if (updates.renewalValue) updateData.renewalValue = updates.renewalValue;
        if (updates.churnReason) updateData.churnReason = updates.churnReason;
        if (updates.notes) updateData.notes = updates.notes;

        // Set outcome based on status
        if (updates.status === "RENEWED") updateData.outcome = "RENEWED";
        if (updates.status === "CHURNED") updateData.outcome = "CHURNED";
        if (updates.status === "DOWNGRADED") updateData.outcome = "DOWNGRADED";
        if (updates.status === "EXPANDED") updateData.outcome = "EXPANDED";

        const renewal = await prisma.renewal.update({
          where: { id: renewalId },
          data: updateData,
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "RENEWAL",
          recordId: renewal.id,
          actorType: "AI_AGENT",
          actorId: userId,
          previousState: existing as unknown as Record<string, unknown>,
          newState: renewal as unknown as Record<string, unknown>,
          metadata: { source: "ai_assistant" },
        });

        return {
          success: true,
          message: `Updated renewal for ${existing.account.name}${updates.status ? ` - Status: ${updates.status}` : ""}`,
        };
      } catch (error) {
        console.error("[Tool:updateRenewal] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

export const getUpcomingRenewalsTool = (orgId: string) =>
  tool({
    description: "Get renewals that are coming up soon (next 30, 60, or 90 days)",
    parameters: z.object({
      days: z.number().min(1).max(365).default(90).describe("Days to look ahead"),
    }),
    execute: async ({ days }) => {
      console.log("[Tool:getUpcomingRenewals] Executing:", { days });
      try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const renewals = await prisma.renewal.findMany({
          where: {
            orgId,
            endDate: {
              gte: new Date(),
              lte: futureDate,
            },
            status: { in: ["UPCOMING", "IN_PROGRESS"] },
          },
          orderBy: { endDate: "asc" },
          include: {
            account: { select: { id: true, name: true } },
          },
        });

        const totalValue = renewals.reduce((sum, r) => sum + Number(r.contractValue), 0);
        const atRisk = renewals.filter(r => r.probability < 50);

        return {
          success: true,
          count: renewals.length,
          totalValue,
          atRiskCount: atRisk.length,
          renewals: renewals.map((r) => {
            const daysUntil = Math.ceil((r.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return {
              id: r.id,
              accountName: r.account.name,
              contractName: r.contractName,
              contractValue: Number(r.contractValue),
              daysUntilExpiry: daysUntil,
              probability: r.probability,
              status: r.status,
            };
          }),
        };
      } catch (error) {
        console.error("[Tool:getUpcomingRenewals] Error:", error);
        return { success: false, count: 0, totalValue: 0, atRiskCount: 0, renewals: [] };
      }
    },
  });

// =============================================================================
// REPORT GENERATION TOOL
// =============================================================================

export const createReportTool = (orgId: string, userId: string) =>
  tool({
    description: "Generate a comprehensive CRM report and save it as a document. Can create reports for specific workspaces (sales, cs, marketing) or across all workspaces. Reports include key metrics, trends, and insights.",
    parameters: z.object({
      title: z.string().describe("Report title (e.g., 'Q4 Sales Performance Report')"),
      workspace: z.enum(["sales", "cs", "marketing", "all"]).default("all").describe("Workspace to report on"),
      reportType: z.enum([
        "summary",      // High-level overview
        "pipeline",     // Sales pipeline analysis
        "performance",  // Team/individual performance
        "health",       // Customer health analysis
        "renewals",     // Renewal forecast
        "campaigns",    // Marketing campaign performance
        "custom",       // Custom report with specific sections
      ]).default("summary"),
      dateRange: z.enum(["today", "week", "month", "quarter", "year", "all"]).default("month"),
      sections: z.array(z.string()).optional().describe("Specific sections to include (for custom reports)"),
      includeCharts: z.boolean().default(true).describe("Include chart data for visualization"),
      accountId: z.string().uuid().optional().describe("Focus report on specific account"),
    }),
    execute: async ({ title, workspace, reportType, dateRange, sections, includeCharts, accountId }) => {
      console.log("[Tool:createReport] Executing:", { title, workspace, reportType, dateRange });
      try {
        const now = new Date();
        let startDate: Date | null = null;
        
        // Calculate date range
        switch (dateRange) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "quarter":
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }

        const dateFilter = startDate ? { gte: startDate } : undefined;
        const reportData: Record<string, unknown> = {
          title,
          generatedAt: new Date().toISOString(),
          workspace,
          reportType,
          dateRange,
        };

        // =====================================================================
        // SALES WORKSPACE DATA
        // =====================================================================
        if (workspace === "all" || workspace === "sales") {
          // Lead metrics
          const [totalLeads, newLeads, convertedLeads, leadsByStatus, leadsBySource] = await Promise.all([
            prisma.lead.count({ where: { orgId } }),
            prisma.lead.count({ where: { orgId, createdAt: dateFilter } }),
            prisma.lead.count({ where: { orgId, status: "CONVERTED", convertedAt: dateFilter } }),
            prisma.lead.groupBy({
              by: ["status"],
              where: { orgId },
              _count: true,
            }),
            prisma.lead.groupBy({
              by: ["source"],
              where: { orgId, source: { not: null } },
              _count: true,
            }),
          ]);

          // Contact & Account metrics
          const [totalContacts, totalAccounts, newContacts, newAccounts] = await Promise.all([
            prisma.contact.count({ where: { orgId } }),
            prisma.account.count({ where: { orgId } }),
            prisma.contact.count({ where: { orgId, createdAt: dateFilter } }),
            prisma.account.count({ where: { orgId, createdAt: dateFilter } }),
          ]);

          // Opportunity metrics
          const [totalOpportunities, openOpportunities, wonOpportunities, lostOpportunities, pipelineValue, wonValue] = await Promise.all([
            prisma.opportunity.count({ where: { orgId } }),
            prisma.opportunity.count({ where: { orgId, closedWon: null } }),
            prisma.opportunity.count({ where: { orgId, closedWon: true, actualCloseDate: dateFilter } }),
            prisma.opportunity.count({ where: { orgId, closedWon: false, actualCloseDate: dateFilter } }),
            prisma.opportunity.aggregate({
              where: { orgId, closedWon: null },
              _sum: { value: true },
            }),
            prisma.opportunity.aggregate({
              where: { orgId, closedWon: true, actualCloseDate: dateFilter },
              _sum: { value: true },
            }),
          ]);

          // Pipeline by stage
          const opportunitiesByStage = await prisma.opportunity.groupBy({
            by: ["stageId"],
            where: { orgId, closedWon: null },
            _count: true,
            _sum: { value: true },
          });

          const stages = await prisma.pipelineStage.findMany({
            where: { orgId, module: "OPPORTUNITY" },
            orderBy: { order: "asc" },
          });

          const pipelineByStage = stages.map(stage => {
            const stageData = opportunitiesByStage.find(o => o.stageId === stage.id);
            return {
              stage: stage.name,
              count: stageData?._count || 0,
              value: Number(stageData?._sum?.value || 0),
            };
          });

          // Calculate conversion rate
          const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
          const winRate = (wonOpportunities + lostOpportunities) > 0 
            ? ((wonOpportunities / (wonOpportunities + lostOpportunities)) * 100).toFixed(1) 
            : 0;

          reportData.sales = {
            summary: {
              totalLeads,
              newLeads,
              convertedLeads,
              conversionRate: `${conversionRate}%`,
              totalContacts,
              newContacts,
              totalAccounts,
              newAccounts,
              totalOpportunities,
              openOpportunities,
              wonOpportunities,
              lostOpportunities,
              winRate: `${winRate}%`,
              pipelineValue: Number(pipelineValue._sum.value || 0),
              wonValue: Number(wonValue._sum.value || 0),
            },
            leadsByStatus: leadsByStatus.map(l => ({ status: l.status, count: l._count })),
            leadsBySource: leadsBySource.map(l => ({ source: l.source || "Unknown", count: l._count })),
            pipelineByStage,
          };
        }

        // =====================================================================
        // CUSTOMER SUCCESS WORKSPACE DATA
        // =====================================================================
        if (workspace === "all" || workspace === "cs") {
          // Ticket metrics
          const [totalTickets, openTickets, resolvedTickets, ticketsByStatus, ticketsByPriority] = await Promise.all([
            prisma.ticket.count({ where: { orgId } }),
            prisma.ticket.count({ where: { orgId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
            prisma.ticket.count({ where: { orgId, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: dateFilter } }),
            prisma.ticket.groupBy({
              by: ["status"],
              where: { orgId },
              _count: true,
            }),
            prisma.ticket.groupBy({
              by: ["priority"],
              where: { orgId, status: { notIn: ["RESOLVED", "CLOSED"] } },
              _count: true,
            }),
          ]);

          // Health score metrics
          const [totalHealthScores, atRiskAccounts, healthByRiskLevel, avgHealthScore] = await Promise.all([
            prisma.accountHealth.count({ where: { orgId } }),
            prisma.accountHealth.count({ where: { orgId, isAtRisk: true } }),
            prisma.accountHealth.groupBy({
              by: ["riskLevel"],
              where: { orgId },
              _count: true,
            }),
            prisma.accountHealth.aggregate({
              where: { orgId },
              _avg: { score: true },
            }),
          ]);

          // Renewal metrics
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 90);

          const [totalRenewals, upcomingRenewals, renewedThisPeriod, churnedThisPeriod, renewalValue] = await Promise.all([
            prisma.renewal.count({ where: { orgId } }),
            prisma.renewal.count({
              where: {
                orgId,
                endDate: { gte: new Date(), lte: futureDate },
                status: { in: ["UPCOMING", "IN_PROGRESS"] },
              },
            }),
            prisma.renewal.count({ where: { orgId, status: "RENEWED", updatedAt: dateFilter } }),
            prisma.renewal.count({ where: { orgId, status: "CHURNED", updatedAt: dateFilter } }),
            prisma.renewal.aggregate({
              where: {
                orgId,
                endDate: { gte: new Date(), lte: futureDate },
                status: { in: ["UPCOMING", "IN_PROGRESS"] },
              },
              _sum: { contractValue: true },
            }),
          ]);

          // Average CSAT
          const avgCSAT = await prisma.ticket.aggregate({
            where: { orgId, satisfactionScore: { not: null } },
            _avg: { satisfactionScore: true },
          });

          reportData.cs = {
            summary: {
              totalTickets,
              openTickets,
              resolvedTickets,
              avgCSAT: avgCSAT._avg.satisfactionScore?.toFixed(1) || "N/A",
              totalAccountsWithHealth: totalHealthScores,
              atRiskAccounts,
              avgHealthScore: avgHealthScore._avg.score?.toFixed(0) || "N/A",
              upcomingRenewals,
              renewedThisPeriod,
              churnedThisPeriod,
              upcomingRenewalValue: Number(renewalValue._sum.contractValue || 0),
            },
            ticketsByStatus: ticketsByStatus.map(t => ({ status: t.status, count: t._count })),
            ticketsByPriority: ticketsByPriority.map(t => ({ priority: t.priority, count: t._count })),
            healthByRiskLevel: healthByRiskLevel.map(h => ({ riskLevel: h.riskLevel, count: h._count })),
          };
        }

        // =====================================================================
        // MARKETING WORKSPACE DATA
        // =====================================================================
        if (workspace === "all" || workspace === "marketing") {
          // Campaign metrics
          const [totalCampaigns, activeCampaigns, completedCampaigns, campaignsByType, campaignsByStatus] = await Promise.all([
            prisma.campaign.count({ where: { orgId } }),
            prisma.campaign.count({ where: { orgId, status: "ACTIVE" } }),
            prisma.campaign.count({ where: { orgId, status: "COMPLETED", completedAt: dateFilter } }),
            prisma.campaign.groupBy({
              by: ["type"],
              where: { orgId },
              _count: true,
            }),
            prisma.campaign.groupBy({
              by: ["status"],
              where: { orgId },
              _count: true,
            }),
          ]);

          // Segment metrics
          const [totalSegments, activeSegments, totalSegmentMembers] = await Promise.all([
            prisma.segment.count({ where: { orgId } }),
            prisma.segment.count({ where: { orgId, isActive: true } }),
            prisma.segment.aggregate({
              where: { orgId, isActive: true },
              _sum: { memberCount: true },
            }),
          ]);

          // Form metrics
          const [totalForms, activeForms, totalSubmissions, formStats] = await Promise.all([
            prisma.form.count({ where: { orgId } }),
            prisma.form.count({ where: { orgId, isActive: true } }),
            prisma.formSubmission.count({ where: { orgId, createdAt: dateFilter } }),
            prisma.form.aggregate({
              where: { orgId },
              _sum: { views: true, submissions: true },
            }),
          ]);

          const overallConversionRate = formStats._sum.views && formStats._sum.views > 0
            ? (((formStats._sum.submissions || 0) / formStats._sum.views) * 100).toFixed(1)
            : 0;

          reportData.marketing = {
            summary: {
              totalCampaigns,
              activeCampaigns,
              completedCampaigns,
              totalSegments,
              activeSegments,
              totalSegmentMembers: totalSegmentMembers._sum.memberCount || 0,
              totalForms,
              activeForms,
              totalFormViews: formStats._sum.views || 0,
              totalFormSubmissions: formStats._sum.submissions || 0,
              formConversionRate: `${overallConversionRate}%`,
              newSubmissions: totalSubmissions,
            },
            campaignsByType: campaignsByType.map(c => ({ type: c.type, count: c._count })),
            campaignsByStatus: campaignsByStatus.map(c => ({ status: c.status, count: c._count })),
          };
        }

        // =====================================================================
        // TASK METRICS (SHARED)
        // =====================================================================
        const [totalTasks, pendingTasks, completedTasks, tasksByWorkspace] = await Promise.all([
          prisma.task.count({ where: { orgId } }),
          prisma.task.count({ where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
          prisma.task.count({ where: { orgId, status: "COMPLETED", completedAt: dateFilter } }),
          prisma.task.groupBy({
            by: ["workspace"],
            where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
            _count: true,
          }),
        ]);

        reportData.tasks = {
          totalTasks,
          pendingTasks,
          completedTasks,
          tasksByWorkspace: tasksByWorkspace.map(t => ({ workspace: t.workspace, count: t._count })),
        };

        // =====================================================================
        // GENERATE REPORT CONTENT
        // =====================================================================
        const reportContent = generateReportMarkdown(reportData);

        // Save as document
        const document = await prisma.document.create({
          data: {
            orgId,
            name: `${title}.md`,
            type: "OTHER",
            fileUrl: "", // Will be updated if we implement file storage
            fileKey: `reports/${Date.now()}-${title.toLowerCase().replace(/\s+/g, "-")}.md`,
            fileSize: Buffer.byteLength(reportContent, "utf8"),
            mimeType: "text/markdown",
            uploadedById: userId,
          },
        });

        // Store report content in metadata (or could use file storage)
        // For now, we'll return it directly and store a reference

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "DOCUMENT",
          recordId: document.id,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: { source: "ai_assistant", reportType, workspace },
        });

        return {
          success: true,
          documentId: document.id,
          title,
          message: `Generated "${title}" report covering ${workspace === "all" ? "all workspaces" : workspace}`,
          reportData,
          reportContent,
        };
      } catch (error) {
        console.error("[Tool:createReport] Error:", error);
        return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
      }
    },
  });

/**
 * Generate markdown report content from data
 */
function generateReportMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const title = data.title as string;
  const generatedAt = new Date(data.generatedAt as string).toLocaleString();
  const workspace = data.workspace as string;
  const dateRange = data.dateRange as string;

  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Scope:** ${workspace === "all" ? "All Workspaces" : workspace.toUpperCase()}`);
  lines.push(`**Period:** ${dateRange}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Sales Section
  const sales = data.sales as Record<string, unknown> | undefined;
  if (sales) {
    const summary = sales.summary as Record<string, unknown>;
    lines.push("## Sales Performance");
    lines.push("");
    lines.push("### Key Metrics");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Leads | ${summary.totalLeads} |`);
    lines.push(`| New Leads | ${summary.newLeads} |`);
    lines.push(`| Converted Leads | ${summary.convertedLeads} |`);
    lines.push(`| Conversion Rate | ${summary.conversionRate} |`);
    lines.push(`| Total Contacts | ${summary.totalContacts} |`);
    lines.push(`| Total Accounts | ${summary.totalAccounts} |`);
    lines.push(`| Open Opportunities | ${summary.openOpportunities} |`);
    lines.push(`| Won Opportunities | ${summary.wonOpportunities} |`);
    lines.push(`| Win Rate | ${summary.winRate} |`);
    lines.push(`| Pipeline Value | ${Number(summary.pipelineValue).toLocaleString()} |`);
    lines.push(`| Won Value | ${Number(summary.wonValue).toLocaleString()} |`);
    lines.push("");

    const pipelineByStage = sales.pipelineByStage as { stage: string; count: number; value: number }[];
    if (pipelineByStage?.length > 0) {
      lines.push("### Pipeline by Stage");
      lines.push("");
      lines.push(`| Stage | Deals | Value |`);
      lines.push(`|-------|-------|-------|`);
      pipelineByStage.forEach(s => {
        lines.push(`| ${s.stage} | ${s.count} | ${s.value.toLocaleString()} |`);
      });
      lines.push("");
    }
  }

  // CS Section
  const cs = data.cs as Record<string, unknown> | undefined;
  if (cs) {
    const summary = cs.summary as Record<string, unknown>;
    lines.push("## Customer Success");
    lines.push("");
    lines.push("### Key Metrics");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Tickets | ${summary.totalTickets} |`);
    lines.push(`| Open Tickets | ${summary.openTickets} |`);
    lines.push(`| Resolved Tickets | ${summary.resolvedTickets} |`);
    lines.push(`| Average CSAT | ${summary.avgCSAT} |`);
    lines.push(`| At-Risk Accounts | ${summary.atRiskAccounts} |`);
    lines.push(`| Average Health Score | ${summary.avgHealthScore} |`);
    lines.push(`| Upcoming Renewals | ${summary.upcomingRenewals} |`);
    lines.push(`| Upcoming Renewal Value | ${Number(summary.upcomingRenewalValue).toLocaleString()} |`);
    lines.push(`| Renewed This Period | ${summary.renewedThisPeriod} |`);
    lines.push(`| Churned This Period | ${summary.churnedThisPeriod} |`);
    lines.push("");

    const healthByRiskLevel = cs.healthByRiskLevel as { riskLevel: string; count: number }[];
    if (healthByRiskLevel?.length > 0) {
      lines.push("### Accounts by Risk Level");
      lines.push("");
      lines.push(`| Risk Level | Count |`);
      lines.push(`|------------|-------|`);
      healthByRiskLevel.forEach(h => {
        lines.push(`| ${h.riskLevel} | ${h.count} |`);
      });
      lines.push("");
    }
  }

  // Marketing Section
  const marketing = data.marketing as Record<string, unknown> | undefined;
  if (marketing) {
    const summary = marketing.summary as Record<string, unknown>;
    lines.push("## Marketing");
    lines.push("");
    lines.push("### Key Metrics");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Campaigns | ${summary.totalCampaigns} |`);
    lines.push(`| Active Campaigns | ${summary.activeCampaigns} |`);
    lines.push(`| Completed Campaigns | ${summary.completedCampaigns} |`);
    lines.push(`| Active Segments | ${summary.activeSegments} |`);
    lines.push(`| Total Segment Members | ${summary.totalSegmentMembers} |`);
    lines.push(`| Active Forms | ${summary.activeForms} |`);
    lines.push(`| Form Views | ${summary.totalFormViews} |`);
    lines.push(`| Form Submissions | ${summary.totalFormSubmissions} |`);
    lines.push(`| Form Conversion Rate | ${summary.formConversionRate} |`);
    lines.push("");

    const campaignsByType = marketing.campaignsByType as { type: string; count: number }[];
    if (campaignsByType?.length > 0) {
      lines.push("### Campaigns by Type");
      lines.push("");
      lines.push(`| Type | Count |`);
      lines.push(`|------|-------|`);
      campaignsByType.forEach(c => {
        lines.push(`| ${c.type} | ${c.count} |`);
      });
      lines.push("");
    }
  }

  // Tasks Section
  const tasks = data.tasks as Record<string, unknown> | undefined;
  if (tasks) {
    lines.push("## Tasks Overview");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Tasks | ${tasks.totalTasks} |`);
    lines.push(`| Pending Tasks | ${tasks.pendingTasks} |`);
    lines.push(`| Completed Tasks | ${tasks.completedTasks} |`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("*Report generated by Y-CRM AI Assistant*");

  return lines.join("\n");
}

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
