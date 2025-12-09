/**
 * Internal Tools for MCP Server
 * Exposes Y-CRM tools via MCP protocol for external clients
 */

import { MCPTool } from "../protocol";
import { ToolRegistry, InternalToolDefinition } from "./index";
import { ToolContext, ToolResult } from "../server/handler";
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

// =============================================================================
// SALES WORKSPACE TOOLS
// =============================================================================

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
          message: `Created lead: ${lead.firstName} ${lead.lastName}${lead.company ? ` at ${lead.company}` : ""} (ID: ${lead.id})`,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create lead" };
    }
  },
};

const searchLeadsTool: InternalToolDefinition = {
  name: "search_leads",
  tool: {
    name: "ycrm_search_leads",
    description: "Search for leads in the CRM by name, email, company, or status.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term to match against name, email, or company" },
        status: { type: "string", description: "Filter by lead status", enum: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] },
        limit: { type: "integer", description: "Maximum results (1-20)", minimum: 1, maximum: 20 },
      },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const where: Record<string, unknown> = { orgId: context.orgId };
      if (args.status) where.status = args.status;
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
        select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true },
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
      return { success: false, error: error instanceof Error ? error.message : "Failed to search leads" };
    }
  },
};

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
        data: { contactId: contact.id, message: `Created contact: ${contact.firstName} ${contact.lastName} (ID: ${contact.id})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create contact" };
    }
  },
};

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
        type: { type: "string", description: "Account type", enum: ["PROSPECT", "CUSTOMER", "PARTNER", "VENDOR"] },
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
        data: { accountId: account.id, message: `Created account: ${account.name} (ID: ${account.id})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create account" };
    }
  },
};

const createTaskTool: InternalToolDefinition = {
  name: "create_task",
  tool: {
    name: "ycrm_create_task",
    description: "Create a new task in the CRM. Supports all workspaces.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title (required)" },
        description: { type: "string", description: "Task description" },
        dueDate: { type: "string", description: "Due date (ISO format)", format: "date-time" },
        priority: { type: "string", description: "Task priority", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        taskType: { type: "string", description: "Type of task", enum: ["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "OTHER"] },
        workspace: { type: "string", description: "Workspace context", enum: ["sales", "cs", "marketing"] },
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
          workspace: (args.workspace as string) || "sales",
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
        data: { taskId: task.id, message: `Created task: ${task.title} (ID: ${task.id})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create task" };
    }
  },
};

const createOpportunityTool: InternalToolDefinition = {
  name: "create_opportunity",
  tool: {
    name: "ycrm_create_opportunity",
    description: "Create a new sales opportunity. Requires an account.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Opportunity name (required)" },
        value: { type: "number", description: "Deal value in dollars (required)" },
        accountId: { type: "string", description: "Associated account ID (required)" },
        expectedCloseDate: { type: "string", description: "Expected close date" },
        probability: { type: "number", description: "Win probability (0-100)" },
      },
      required: ["name", "value", "accountId"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const account = await prisma.account.findFirst({
        where: { id: args.accountId as string, orgId: context.orgId },
      });
      if (!account) {
        return { success: false, error: "Account not found" };
      }

      const defaultStage = await prisma.pipelineStage.findFirst({
        where: { orgId: context.orgId, module: "OPPORTUNITY", isWon: false, isLost: false },
        orderBy: { order: "asc" },
      });
      if (!defaultStage) {
        return { success: false, error: "No pipeline stages configured" };
      }

      const opportunity = await prisma.opportunity.create({
        data: {
          orgId: context.orgId,
          name: args.name as string,
          value: args.value as number,
          accountId: args.accountId as string,
          stageId: defaultStage.id,
          expectedCloseDate: args.expectedCloseDate ? new Date(args.expectedCloseDate as string) : null,
          probability: (args.probability as number) || 50,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "OPPORTUNITY",
        recordId: opportunity.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: opportunity as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateOpportunityCaches();

      return {
        success: true,
        data: { opportunityId: opportunity.id, message: `Created opportunity: ${opportunity.name} worth $${args.value} (ID: ${opportunity.id})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create opportunity" };
    }
  },
};

// =============================================================================
// CS WORKSPACE TOOLS
// =============================================================================

const createTicketTool: InternalToolDefinition = {
  name: "create_ticket",
  tool: {
    name: "ycrm_create_ticket",
    description: "Create a new support ticket in the Customer Success workspace.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Ticket subject (required)" },
        description: { type: "string", description: "Ticket description" },
        accountId: { type: "string", description: "Account ID (required)" },
        contactId: { type: "string", description: "Contact ID" },
        priority: { type: "string", description: "Priority", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        category: { type: "string", description: "Category", enum: ["BUG", "BILLING", "FEATURE_REQUEST", "QUESTION", "GENERAL"] },
      },
      required: ["subject", "accountId"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const account = await prisma.account.findFirst({
        where: { id: args.accountId as string, orgId: context.orgId },
      });
      if (!account) {
        return { success: false, error: "Account not found" };
      }

      const ticket = await prisma.ticket.create({
        data: {
          orgId: context.orgId,
          subject: args.subject as string,
          description: args.description as string | undefined,
          accountId: args.accountId as string,
          contactId: args.contactId as string | undefined,
          priority: (args.priority as string) || "MEDIUM",
          category: args.category as string | undefined,
          status: "NEW",
          createdById: context.userId,
          createdByType: "AI_AGENT",
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "TICKET",
        recordId: ticket.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: ticket as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateTicketCaches();

      return {
        success: true,
        data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, message: `Created ticket #${ticket.ticketNumber}: ${ticket.subject}` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create ticket" };
    }
  },
};

const searchTicketsTool: InternalToolDefinition = {
  name: "search_tickets",
  tool: {
    name: "ycrm_search_tickets",
    description: "Search for support tickets.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        status: { type: "string", description: "Status filter", enum: ["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"] },
        priority: { type: "string", description: "Priority filter", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        accountId: { type: "string", description: "Filter by account" },
        limit: { type: "integer", description: "Max results", minimum: 1, maximum: 20 },
      },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const where: Record<string, unknown> = { orgId: context.orgId };
      if (args.status) where.status = args.status;
      if (args.priority) where.priority = args.priority;
      if (args.accountId) where.accountId = args.accountId;
      if (args.query) where.subject = { contains: args.query as string, mode: "insensitive" };

      const tickets = await prisma.ticket.findMany({
        where,
        take: (args.limit as number) || 10,
        orderBy: { createdAt: "desc" },
        include: { account: { select: { name: true } } },
      });

      return {
        success: true,
        data: {
          count: tickets.length,
          tickets: tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            account: t.account.name,
          })),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to search tickets" };
    }
  },
};

const getHealthScoreTool: InternalToolDefinition = {
  name: "get_health_score",
  tool: {
    name: "ycrm_get_health_score",
    description: "Get the health score for an account.",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Account ID (required)" },
      },
      required: ["accountId"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const health = await prisma.accountHealth.findUnique({
        where: { accountId: args.accountId as string },
        include: { account: { select: { name: true } } },
      });

      if (!health) {
        return { success: true, data: { message: "No health score recorded for this account", health: null } };
      }

      return {
        success: true,
        data: {
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
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to get health score" };
    }
  },
};

const searchPlaybooksTool: InternalToolDefinition = {
  name: "search_playbooks",
  tool: {
    name: "ycrm_search_playbooks",
    description: "Search for customer success playbooks.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        trigger: { type: "string", description: "Trigger type", enum: ["MANUAL", "NEW_CUSTOMER", "RENEWAL_APPROACHING", "HEALTH_DROP", "TICKET_ESCALATION"] },
        isActive: { type: "boolean", description: "Filter active only" },
        limit: { type: "integer", description: "Max results", minimum: 1, maximum: 20 },
      },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const where: Record<string, unknown> = { orgId: context.orgId };
      if (args.isActive !== undefined) where.isActive = args.isActive;
      if (args.trigger) where.trigger = args.trigger;
      if (args.query) where.name = { contains: args.query as string, mode: "insensitive" };

      const playbooks = await prisma.playbook.findMany({
        where,
        take: (args.limit as number) || 10,
        orderBy: { name: "asc" },
      });

      return {
        success: true,
        data: {
          count: playbooks.length,
          playbooks: playbooks.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            trigger: p.trigger,
            isActive: p.isActive,
          })),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to search playbooks" };
    }
  },
};

// =============================================================================
// MARKETING WORKSPACE TOOLS
// =============================================================================

const createCampaignTool: InternalToolDefinition = {
  name: "create_campaign",
  tool: {
    name: "ycrm_create_campaign",
    description: "Create a new marketing campaign.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name (required)" },
        description: { type: "string", description: "Description" },
        type: { type: "string", description: "Campaign type (required)", enum: ["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"] },
        segmentId: { type: "string", description: "Target segment ID" },
        subject: { type: "string", description: "Email subject or headline" },
        scheduledAt: { type: "string", description: "Schedule time (ISO format)" },
      },
      required: ["name", "type"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          orgId: context.orgId,
          name: args.name as string,
          description: args.description as string | undefined,
          type: args.type as string,
          segmentId: args.segmentId as string | undefined,
          subject: args.subject as string | undefined,
          scheduledAt: args.scheduledAt ? new Date(args.scheduledAt as string) : null,
          status: "DRAFT",
          createdById: context.userId,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "CAMPAIGN",
        recordId: campaign.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: campaign as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateCampaignCaches();

      return {
        success: true,
        data: { campaignId: campaign.id, message: `Created ${args.type} campaign: ${campaign.name} (ID: ${campaign.id})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create campaign" };
    }
  },
};

const searchCampaignsTool: InternalToolDefinition = {
  name: "search_campaigns",
  tool: {
    name: "ycrm_search_campaigns",
    description: "Search for marketing campaigns.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        status: { type: "string", description: "Status filter", enum: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] },
        type: { type: "string", description: "Type filter", enum: ["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"] },
        limit: { type: "integer", description: "Max results", minimum: 1, maximum: 20 },
      },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const where: Record<string, unknown> = { orgId: context.orgId };
      if (args.status) where.status = args.status;
      if (args.type) where.type = args.type;
      if (args.query) where.name = { contains: args.query as string, mode: "insensitive" };

      const campaigns = await prisma.campaign.findMany({
        where,
        take: (args.limit as number) || 10,
        orderBy: { createdAt: "desc" },
        include: { segment: { select: { name: true, memberCount: true } } },
      });

      return {
        success: true,
        data: {
          count: campaigns.length,
          campaigns: campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            status: c.status,
            segment: c.segment?.name,
            audienceSize: c.segment?.memberCount,
          })),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to search campaigns" };
    }
  },
};

const createSegmentTool: InternalToolDefinition = {
  name: "create_segment",
  tool: {
    name: "ycrm_create_segment",
    description: "Create a new audience segment.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Segment name (required)" },
        description: { type: "string", description: "Description" },
        type: { type: "string", description: "Segment type", enum: ["DYNAMIC", "STATIC"] },
      },
      required: ["name"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const segment = await prisma.segment.create({
        data: {
          orgId: context.orgId,
          name: args.name as string,
          description: args.description as string | undefined,
          type: (args.type as string) || "DYNAMIC",
          createdById: context.userId,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "SEGMENT",
        recordId: segment.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: segment as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateSegmentCaches();

      return {
        success: true,
        data: { segmentId: segment.id, message: `Created segment: ${segment.name} (ID: ${segment.id})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create segment" };
    }
  },
};

const createFormTool: InternalToolDefinition = {
  name: "create_form",
  tool: {
    name: "ycrm_create_form",
    description: "Create a new lead capture form.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Form name (required)" },
        description: { type: "string", description: "Description" },
        createLead: { type: "boolean", description: "Auto-create lead from submissions" },
      },
      required: ["name"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const slug = (args.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existing = await prisma.form.findFirst({ where: { orgId: context.orgId, slug } });
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      const form = await prisma.form.create({
        data: {
          orgId: context.orgId,
          name: args.name as string,
          description: args.description as string | undefined,
          slug: finalSlug,
          createLead: args.createLead !== false,
          fields: [
            { id: "field-0", type: "text", label: "Full Name", required: true },
            { id: "field-1", type: "email", label: "Email", required: true },
          ],
          isActive: true,
          createdById: context.userId,
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "FORM",
        recordId: form.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: form as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateFormCaches();

      return {
        success: true,
        data: { formId: form.id, slug: form.slug, message: `Created form: ${form.name} (slug: ${form.slug})` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create form" };
    }
  },
};

// =============================================================================
// CUSTOM MODULE TOOLS
// =============================================================================

const listCustomModulesTool: InternalToolDefinition = {
  name: "list_custom_modules",
  tool: {
    name: "ycrm_list_custom_modules",
    description: "List all custom modules in the system.",
    inputSchema: { type: "object", properties: {} },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const modules = await prisma.customModule.findMany({
        where: { orgId: context.orgId, isActive: true },
        orderBy: { displayOrder: "asc" },
        include: { _count: { select: { records: true, fields: true } } },
      });

      return {
        success: true,
        data: {
          count: modules.length,
          modules: modules.map((m) => ({
            id: m.id,
            name: m.name,
            pluralName: m.pluralName,
            slug: m.slug,
            recordCount: m._count.records,
            fieldCount: m._count.fields,
          })),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to list modules" };
    }
  },
};

const createCustomModuleTool: InternalToolDefinition = {
  name: "create_custom_module",
  tool: {
    name: "ycrm_create_custom_module",
    description: "Create a new custom module (e.g., Products, Projects).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Module name (singular)" },
        pluralName: { type: "string", description: "Plural name" },
        description: { type: "string", description: "Description" },
        icon: { type: "string", description: "Lucide icon name" },
      },
      required: ["name", "pluralName"],
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const slug = (args.pluralName as string).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existing = await prisma.customModule.findFirst({ where: { orgId: context.orgId, slug } });
      if (existing) {
        return { success: false, error: `Module with slug "${slug}" already exists` };
      }

      const module = await prisma.customModule.create({
        data: {
          orgId: context.orgId,
          name: args.name as string,
          pluralName: args.pluralName as string,
          slug,
          description: args.description as string | undefined,
          icon: (args.icon as string) || "box",
        },
      });

      await createAuditLog({
        orgId: context.orgId,
        action: "CREATE",
        module: "CUSTOM_MODULE",
        recordId: module.id,
        actorType: "AI_AGENT",
        actorId: context.userId,
        newState: module as unknown as Record<string, unknown>,
        metadata: { source: "mcp_server" },
      });

      revalidateCustomModuleCaches();

      return {
        success: true,
        data: { moduleId: module.id, slug: module.slug, message: `Created custom module: ${module.name}` },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create module" };
    }
  },
};

// =============================================================================
// DASHBOARD TOOL
// =============================================================================

const getDashboardTool: InternalToolDefinition = {
  name: "get_dashboard",
  tool: {
    name: "ycrm_get_dashboard",
    description: "Get a summary of CRM data across all workspaces.",
    inputSchema: {
      type: "object",
      properties: {
        workspace: { type: "string", description: "Filter by workspace", enum: ["sales", "cs", "marketing", "all"] },
      },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const workspace = (args.workspace as string) || "all";
      const stats: Record<string, unknown> = {};

      if (workspace === "all" || workspace === "sales") {
        const [leadCount, newLeadsCount, contactCount, accountCount, opportunityCount, pipelineValue] = await Promise.all([
          prisma.lead.count({ where: { orgId: context.orgId } }),
          prisma.lead.count({ where: { orgId: context.orgId, status: "NEW" } }),
          prisma.contact.count({ where: { orgId: context.orgId } }),
          prisma.account.count({ where: { orgId: context.orgId } }),
          prisma.opportunity.count({ where: { orgId: context.orgId, closedWon: null } }),
          prisma.opportunity.aggregate({ where: { orgId: context.orgId, closedWon: null }, _sum: { value: true } }),
        ]);

        stats.sales = {
          leads: { total: leadCount, new: newLeadsCount },
          contacts: contactCount,
          accounts: accountCount,
          opportunities: opportunityCount,
          pipelineValue: Number(pipelineValue._sum.value || 0),
        };
      }

      if (workspace === "all" || workspace === "cs") {
        const [openTickets, atRiskAccounts] = await Promise.all([
          prisma.ticket.count({ where: { orgId: context.orgId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
          prisma.accountHealth.count({ where: { orgId: context.orgId, isAtRisk: true } }),
        ]);

        stats.cs = { openTickets, atRiskAccounts };
      }

      if (workspace === "all" || workspace === "marketing") {
        const [activeCampaigns, activeSegments] = await Promise.all([
          prisma.campaign.count({ where: { orgId: context.orgId, status: "ACTIVE" } }),
          prisma.segment.count({ where: { orgId: context.orgId, isActive: true } }),
        ]);

        stats.marketing = { activeCampaigns, activeSegments };
      }

      const pendingTasks = await prisma.task.count({
        where: { orgId: context.orgId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      });

      stats.tasks = { pending: pendingTasks };

      return { success: true, data: { summary: stats } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to get dashboard" };
    }
  },
};

// =============================================================================
// EXPORT ALL TOOLS
// =============================================================================

export const internalTools: InternalToolDefinition[] = [
  // Sales
  createLeadTool,
  searchLeadsTool,
  createContactTool,
  createAccountTool,
  createTaskTool,
  createOpportunityTool,
  // CS
  createTicketTool,
  searchTicketsTool,
  getHealthScoreTool,
  searchPlaybooksTool,
  // Marketing
  createCampaignTool,
  searchCampaignsTool,
  createSegmentTool,
  createFormTool,
  // Custom Modules
  listCustomModulesTool,
  createCustomModuleTool,
  // Dashboard
  getDashboardTool,
];

/**
 * Register all internal tools with the registry
 */
export function registerInternalTools(registry: ToolRegistry): void {
  registry.registerInternalTools(internalTools);
}
