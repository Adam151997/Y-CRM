/**
 * Internal Tools for MCP
 * Converts Y-CRM's existing tools to MCP format and registers them
 */

import { MCPTool, JSONSchema } from "../protocol";
import { ToolRegistry, InternalToolDefinition } from "./index";
import { ToolContext, ToolResult } from "../server";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  revalidateLeadCaches,
  revalidateContactCaches,
  revalidateAccountCaches,
  revalidateTaskCaches,
  revalidateOpportunityCaches,
} from "@/lib/cache-utils";

/**
 * Create Lead Tool
 */
const createLeadTool: InternalToolDefinition = {
  name: "create_lead",
  tool: {
    name: "ycrm_create_lead",
    description: "Create a new lead in the CRM. Use this when the user wants to add a new lead or prospect.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Lead's first name (required)" },
        lastName: { type: "string", description: "Lead's last name (required)" },
        email: { type: "string", description: "Lead's email address" },
        phone: { type: "string", description: "Lead's phone number" },
        company: { type: "string", description: "Company name" },
        title: { type: "string", description: "Job title" },
        source: {
          type: "string",
          description: "Lead source",
          enum: ["REFERRAL", "WEBSITE", "COLD_CALL", "LINKEDIN", "TRADE_SHOW", "ADVERTISEMENT", "EMAIL_CAMPAIGN", "OTHER"],
        },
      },
      required: ["firstName", "lastName"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const lead = await prisma.lead.create({
        data: {
          orgId: context.orgId,
          firstName: args.firstName as string,
          lastName: args.lastName as string,
          email: args.email as string | undefined,
          phone: args.phone as string | undefined,
          company: args.company as string | undefined,
          title: args.title as string | undefined,
          source: args.source as string | undefined,
          status: "NEW",
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "LEAD",
        recordId: lead.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: lead as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateLeadCaches();

      return {
        success: true,
        data: {
          leadId: lead.id,
          message: `Created lead: ${lead.firstName} ${lead.lastName}${lead.company ? ` at ${lead.company}` : ""}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create lead",
      };
    }
  },
};

/**
 * Search Leads Tool
 */
const searchLeadsTool: InternalToolDefinition = {
  name: "search_leads",
  tool: {
    name: "ycrm_search_leads",
    description: "Search for leads in the CRM by name, email, company, or status.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term to match against name, email, or company" },
        status: {
          type: "string",
          description: "Filter by lead status",
          enum: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
        },
        limit: { type: "integer", description: "Maximum results (1-20)", minimum: 1, maximum: 20, default: 5 },
      },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const where: Record<string, unknown> = { orgId: context.orgId };

      if (args.status) {
        where.status = args.status;
      }

      if (args.query) {
        where.OR = [
          { firstName: { contains: args.query as string, mode: "insensitive" } },
          { lastName: { contains: args.query as string, mode: "insensitive" } },
          { email: { contains: args.query as string, mode: "insensitive" } },
          { company: { contains: args.query as string, mode: "insensitive" } },
        ];
      }

      const leads = await prisma.lead.findMany({
        where,
        take: (args.limit as number) || 5,
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

      return {
        success: true,
        data: {
          count: leads.length,
          leads: leads.map((l) => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            email: l.email,
            company: l.company,
            status: l.status,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search leads",
      };
    }
  },
};

/**
 * Create Contact Tool
 */
const createContactTool: InternalToolDefinition = {
  name: "create_contact",
  tool: {
    name: "ycrm_create_contact",
    description: "Create a new contact in the CRM.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Contact's first name (required)" },
        lastName: { type: "string", description: "Contact's last name (required)" },
        email: { type: "string", description: "Contact's email address" },
        phone: { type: "string", description: "Contact's phone number" },
        title: { type: "string", description: "Job title" },
        department: { type: "string", description: "Department" },
        accountId: { type: "string", description: "Associated account ID" },
      },
      required: ["firstName", "lastName"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const contact = await prisma.contact.create({
        data: {
          orgId: context.orgId,
          firstName: args.firstName as string,
          lastName: args.lastName as string,
          email: args.email as string | undefined,
          phone: args.phone as string | undefined,
          title: args.title as string | undefined,
          department: args.department as string | undefined,
          accountId: args.accountId as string | undefined,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "CONTACT",
        recordId: contact.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: contact as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateContactCaches();

      return {
        success: true,
        data: {
          contactId: contact.id,
          message: `Created contact: ${contact.firstName} ${contact.lastName}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create contact",
      };
    }
  },
};

/**
 * Create Task Tool
 */
const createTaskTool: InternalToolDefinition = {
  name: "create_task",
  tool: {
    name: "ycrm_create_task",
    description: "Create a new task in the CRM.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title (required)" },
        description: { type: "string", description: "Task description" },
        dueDate: { type: "string", description: "Due date (ISO format)", format: "date-time" },
        priority: {
          type: "string",
          description: "Task priority",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        },
        taskType: {
          type: "string",
          description: "Type of task",
          enum: ["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "OTHER"],
        },
        leadId: { type: "string", description: "Associated lead ID" },
        contactId: { type: "string", description: "Associated contact ID" },
        accountId: { type: "string", description: "Associated account ID" },
        opportunityId: { type: "string", description: "Associated opportunity ID" },
      },
      required: ["title"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const task = await prisma.task.create({
        data: {
          orgId: context.orgId,
          title: args.title as string,
          description: args.description as string | undefined,
          dueDate: args.dueDate ? new Date(args.dueDate as string) : undefined,
          priority: (args.priority as string) || "MEDIUM",
          taskType: args.taskType as string | undefined,
          status: "PENDING",
          leadId: args.leadId as string | undefined,
          contactId: args.contactId as string | undefined,
          accountId: args.accountId as string | undefined,
          opportunityId: args.opportunityId as string | undefined,
          createdById: context.userId,
          createdByType: "AI_AGENT",
          assignedToId: context.userId,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "TASK",
        recordId: task.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: task as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateTaskCaches();

      return {
        success: true,
        data: {
          taskId: task.id,
          message: `Created task: ${task.title}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create task",
      };
    }
  },
};

/**
 * Create Account Tool
 */
const createAccountTool: InternalToolDefinition = {
  name: "create_account",
  tool: {
    name: "ycrm_create_account",
    description: "Create a new account (company) in the CRM.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Account/company name (required)" },
        industry: { type: "string", description: "Industry" },
        website: { type: "string", description: "Website URL" },
        phone: { type: "string", description: "Phone number" },
        type: {
          type: "string",
          description: "Account type",
          enum: ["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"],
        },
      },
      required: ["name"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const account = await prisma.account.create({
        data: {
          orgId: context.orgId,
          name: args.name as string,
          industry: args.industry as string | undefined,
          website: args.website as string | undefined,
          phone: args.phone as string | undefined,
          type: args.type as string | undefined,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "ACCOUNT",
        recordId: account.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: account as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateAccountCaches();

      return {
        success: true,
        data: {
          accountId: account.id,
          message: `Created account: ${account.name}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create account",
      };
    }
  },
};

/**
 * Get Dashboard Summary Tool
 */
const getDashboardTool: InternalToolDefinition = {
  name: "get_dashboard",
  tool: {
    name: "ycrm_get_dashboard",
    description: "Get a summary of CRM data including lead counts, task counts, and recent activity.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const [
        leadCount,
        newLeadsCount,
        contactCount,
        accountCount,
        taskCount,
        pendingTaskCount,
        opportunityCount,
      ] = await Promise.all([
        prisma.lead.count({ where: { orgId: context.orgId } }),
        prisma.lead.count({ where: { orgId: context.orgId, status: "NEW" } }),
        prisma.contact.count({ where: { orgId: context.orgId } }),
        prisma.account.count({ where: { orgId: context.orgId } }),
        prisma.task.count({ where: { orgId: context.orgId } }),
        prisma.task.count({ where: { orgId: context.orgId, status: "PENDING" } }),
        prisma.opportunity.count({ where: { orgId: context.orgId } }),
      ]);

      return {
        success: true,
        data: {
          summary: {
            leads: { total: leadCount, new: newLeadsCount },
            contacts: { total: contactCount },
            accounts: { total: accountCount },
            tasks: { total: taskCount, pending: pendingTaskCount },
            opportunities: { total: opportunityCount },
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get dashboard",
      };
    }
  },
};

/**
 * All internal tools
 */
export const internalTools: InternalToolDefinition[] = [
  createLeadTool,
  searchLeadsTool,
  createContactTool,
  createTaskTool,
  createAccountTool,
  getDashboardTool,
];

/**
 * Register all internal tools with the registry
 */
export function registerInternalTools(registry: ToolRegistry): void {
  registry.registerInternalTools(internalTools);
}
