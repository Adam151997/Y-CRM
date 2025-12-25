/**
 * Workflow Automation Tools
 * Quick action tools for common multi-step workflows
 * (Simplified version that doesn't require schema changes)
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { logToolExecution, handleToolError } from "../helpers";

export function createWorkflowTools(orgId: string, userId: string) {
  return {
    convertLeadToOpportunity: convertLeadToOpportunityTool(orgId, userId),
    qualifyAndAssignLead: qualifyAndAssignLeadTool(orgId, userId),
    closeWonOpportunity: closeWonOpportunityTool(orgId, userId),
    escalateTicket: escalateTicketTool(orgId, userId),
    onboardNewCustomer: onboardNewCustomerTool(orgId, userId),
  };
}

const convertLeadToOpportunityTool = (orgId: string, userId: string) =>
  tool({
    description: `Convert a qualified lead into an opportunity with account and contact.

This workflow:
1. Creates an account from the lead's company
2. Creates a contact from the lead's info
3. Creates an opportunity linked to the account
4. Updates lead status to CONVERTED

Example: "Convert lead John Smith to an opportunity worth $50,000"`,
    parameters: z.object({
      leadId: z.string().uuid().describe("Lead ID to convert"),
      opportunityName: z.string().optional().describe("Name for the opportunity (default: uses lead's company name)"),
      opportunityValue: z.number().positive().optional().describe("Expected deal value (e.g., 50000)"),
      opportunityStage: z.string().optional().describe("Initial stage (default: QUALIFICATION)"),
    }),
    execute: async ({ leadId, opportunityName, opportunityValue, opportunityStage }) => {
      logToolExecution("convertLeadToOpportunity", { leadId, opportunityName, opportunityValue });
      try {
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, orgId },
        });

        if (!lead) {
          return { success: false, message: "Lead not found", errorCode: "NOT_FOUND" as const };
        }

        if (lead.status === "CONVERTED") {
          return { success: false, message: "Lead is already converted", errorCode: "VALIDATION" as const };
        }

        // Execute conversion in transaction
        const result = await prisma.$transaction(async (tx) => {
          // 1. Create or find account
          let account = lead.company
            ? await tx.account.findFirst({
                where: { orgId, name: { equals: lead.company, mode: "insensitive" } },
              })
            : null;

          if (!account && lead.company) {
            account = await tx.account.create({
              data: {
                orgId,
                name: lead.company,
                type: "PROSPECT",
                assignedToId: lead.assignedToId,
              },
            });
          }

          // 2. Create contact
          const contact = await tx.contact.create({
            data: {
              orgId,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone,
              title: lead.title,
              accountId: account?.id,
              isPrimary: true,
            },
          });

          // 3. Create opportunity
          const opportunity = await tx.opportunity.create({
            data: {
              orgId,
              name: opportunityName || `${lead.company || lead.firstName} - New Opportunity`,
              accountId: account?.id || "",
              stage: opportunityStage || "QUALIFICATION",
              value: opportunityValue,
              probability: 20,
              assignedToId: lead.assignedToId,
            },
          });

          // 4. Update lead status
          await tx.lead.update({
            where: { id: leadId },
            data: {
              status: "CONVERTED",
              convertedAt: new Date(),
            },
          });

          return { account, contact, opportunity };
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "LEAD",
          recordId: leadId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            workflow: "convertLeadToOpportunity",
            accountId: result.account?.id,
            contactId: result.contact.id,
            opportunityId: result.opportunity.id,
          },
        });

        return {
          success: true,
          message: `Successfully converted ${lead.firstName} ${lead.lastName} to opportunity.`,
          created: {
            account: result.account ? { id: result.account.id, name: result.account.name } : null,
            contact: { id: result.contact.id, name: `${result.contact.firstName} ${result.contact.lastName}` },
            opportunity: { id: result.opportunity.id, name: result.opportunity.name },
          },
        };
      } catch (error) {
        return handleToolError(error, "convertLeadToOpportunity");
      }
    },
  });

const qualifyAndAssignLeadTool = (orgId: string, userId: string) =>
  tool({
    description: `Qualify a lead and assign to a sales rep in one action.

This workflow:
1. Updates lead status to QUALIFIED
2. Assigns to specified team member
3. Creates a follow-up task

Example: "Qualify lead and assign to John for follow-up tomorrow"`,
    parameters: z.object({
      leadId: z.string().uuid().describe("Lead ID to qualify"),
      assignToId: z.string().describe("User ID to assign the lead to"),
      followUpDate: z.string().optional().describe("Date for follow-up task (e.g., 'tomorrow', '2024-12-30')"),
      notes: z.string().optional().describe("Qualification notes"),
    }),
    execute: async ({ leadId, assignToId, followUpDate, notes }) => {
      logToolExecution("qualifyAndAssignLead", { leadId, assignToId, followUpDate });
      try {
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, orgId },
        });

        if (!lead) {
          return { success: false, message: "Lead not found", errorCode: "NOT_FOUND" as const };
        }

        // Parse follow-up date
        let dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1); // Default: tomorrow

        if (followUpDate) {
          if (followUpDate.toLowerCase() === "tomorrow") {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1);
          } else if (followUpDate.toLowerCase() === "next week") {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
          } else {
            const parsed = new Date(followUpDate);
            if (!isNaN(parsed.getTime())) {
              dueDate = parsed;
            }
          }
        }

        const result = await prisma.$transaction(async (tx) => {
          // 1. Update lead
          const updatedLead = await tx.lead.update({
            where: { id: leadId },
            data: {
              status: "QUALIFIED",
              assignedToId: assignToId,
            },
          });

          // 2. Create follow-up task
          const task = await tx.task.create({
            data: {
              orgId,
              title: `Follow up with ${lead.firstName} ${lead.lastName}`,
              description: notes || `Qualified lead - follow up to discuss next steps.`,
              type: "FOLLOW_UP",
              status: "PENDING",
              dueDate,
              leadId,
              assignedToId: assignToId,
              createdById: userId,
            },
          });

          // 3. Add note if provided
          let note = null;
          if (notes) {
            note = await tx.note.create({
              data: {
                orgId,
                content: `Qualification Notes: ${notes}`,
                leadId,
                createdById: userId,
              },
            });
          }

          return { updatedLead, task, note };
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "LEAD",
          recordId: leadId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            workflow: "qualifyAndAssignLead",
            newStatus: "QUALIFIED",
            assignedTo: assignToId,
            taskId: result.task.id,
          },
        });

        return {
          success: true,
          message: `Qualified and assigned ${lead.firstName} ${lead.lastName}. Follow-up task created for ${dueDate.toLocaleDateString()}.`,
          leadId,
          taskId: result.task.id,
          taskDueDate: dueDate.toISOString(),
        };
      } catch (error) {
        return handleToolError(error, "qualifyAndAssignLead");
      }
    },
  });

const closeWonOpportunityTool = (orgId: string, userId: string) =>
  tool({
    description: `Mark an opportunity as won and perform follow-up actions.

This workflow:
1. Updates opportunity stage to CLOSED_WON
2. Updates account type to CUSTOMER
3. Creates onboarding task
4. Logs the win

Example: "Close opportunity as won for Acme Corp"`,
    parameters: z.object({
      opportunityId: z.string().uuid().describe("Opportunity ID to close"),
      closeDate: z.string().optional().describe("Close date (default: today)"),
      finalValue: z.number().positive().optional().describe("Final deal value if different from original"),
      notes: z.string().optional().describe("Notes about the deal"),
    }),
    execute: async ({ opportunityId, closeDate, finalValue, notes }) => {
      logToolExecution("closeWonOpportunity", { opportunityId, closeDate, finalValue });
      try {
        const opportunity = await prisma.opportunity.findFirst({
          where: { id: opportunityId, orgId },
          include: { account: true },
        });

        if (!opportunity) {
          return { success: false, message: "Opportunity not found", errorCode: "NOT_FOUND" as const };
        }

        if (opportunity.stage === "CLOSED_WON") {
          return { success: false, message: "Opportunity is already closed won", errorCode: "VALIDATION" as const };
        }

        const parsedCloseDate = closeDate ? new Date(closeDate) : new Date();

        const result = await prisma.$transaction(async (tx) => {
          // 1. Update opportunity
          const updatedOpp = await tx.opportunity.update({
            where: { id: opportunityId },
            data: {
              stage: "CLOSED_WON",
              probability: 100,
              value: finalValue ?? opportunity.value,
              closeDate: parsedCloseDate,
            },
          });

          // 2. Update account to CUSTOMER
          if (opportunity.accountId) {
            await tx.account.update({
              where: { id: opportunity.accountId },
              data: { type: "CUSTOMER" },
            });
          }

          // 3. Create onboarding task
          const onboardingDate = new Date();
          onboardingDate.setDate(onboardingDate.getDate() + 3);

          const task = await tx.task.create({
            data: {
              orgId,
              title: `Onboard ${opportunity.account?.name || "new customer"}`,
              description: notes || `New customer onboarding for ${opportunity.name}`,
              type: "ONBOARDING",
              status: "PENDING",
              dueDate: onboardingDate,
              accountId: opportunity.accountId,
              assignedToId: opportunity.assignedToId,
              createdById: userId,
            },
          });

          // 4. Add note
          if (notes && opportunity.accountId) {
            await tx.note.create({
              data: {
                orgId,
                content: `Deal Won: ${notes}`,
                accountId: opportunity.accountId,
                createdById: userId,
              },
            });
          }

          return { updatedOpp, task };
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "OPPORTUNITY",
          recordId: opportunityId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            workflow: "closeWonOpportunity",
            previousStage: opportunity.stage,
            finalValue: finalValue ?? opportunity.value?.toNumber(),
          },
        });

        return {
          success: true,
          message: `Closed ${opportunity.name} as won! Account upgraded to customer, onboarding task created.`,
          opportunityId,
          value: (finalValue ?? opportunity.value?.toNumber()) || 0,
          onboardingTaskId: result.task.id,
        };
      } catch (error) {
        return handleToolError(error, "closeWonOpportunity");
      }
    },
  });

const escalateTicketTool = (orgId: string, userId: string) =>
  tool({
    description: `Escalate a support ticket to higher priority with notifications.

This workflow:
1. Increases ticket priority
2. Adds escalation note
3. Creates urgent follow-up task
4. Logs the escalation

Example: "Escalate ticket for Acme Corp - they're very unhappy"`,
    parameters: z.object({
      ticketId: z.string().uuid().describe("Ticket ID to escalate"),
      newPriority: z.enum(["HIGH", "URGENT"]).describe("New priority level"),
      reason: z.string().describe("Reason for escalation"),
      assignToId: z.string().optional().describe("Reassign to specific user"),
    }),
    execute: async ({ ticketId, newPriority, reason, assignToId }) => {
      logToolExecution("escalateTicket", { ticketId, newPriority, reason });
      try {
        const ticket = await prisma.ticket.findFirst({
          where: { id: ticketId, orgId },
          include: { account: true },
        });

        if (!ticket) {
          return { success: false, message: "Ticket not found", errorCode: "NOT_FOUND" as const };
        }

        const result = await prisma.$transaction(async (tx) => {
          // 1. Update ticket priority
          const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: {
              priority: newPriority,
              status: "IN_PROGRESS",
              assignedToId: assignToId || ticket.assignedToId,
            },
          });

          // 2. Add escalation message
          const message = await tx.ticketMessage.create({
            data: {
              ticketId,
              content: `ESCALATION: ${reason}`,
              senderType: "INTERNAL",
              senderId: userId,
            },
          });

          // 3. Create urgent task
          const urgentDate = new Date();
          urgentDate.setHours(urgentDate.getHours() + (newPriority === "URGENT" ? 2 : 4));

          const task = await tx.task.create({
            data: {
              orgId,
              title: `[ESCALATED] Resolve ${ticket.subject}`,
              description: `Escalation reason: ${reason}\n\nOriginal ticket: ${ticket.subject}`,
              type: "OTHER",
              status: "PENDING",
              dueDate: urgentDate,
              accountId: ticket.accountId,
              assignedToId: assignToId || ticket.assignedToId,
              createdById: userId,
            },
          });

          return { updatedTicket, message, task };
        });

        await createAuditLog({
          orgId,
          action: "UPDATE",
          module: "TICKET",
          recordId: ticketId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            workflow: "escalateTicket",
            previousPriority: ticket.priority,
            newPriority,
            reason,
          },
        });

        return {
          success: true,
          message: `Escalated ticket "${ticket.subject}" to ${newPriority} priority. Urgent task created.`,
          ticketId,
          newPriority,
          taskId: result.task.id,
        };
      } catch (error) {
        return handleToolError(error, "escalateTicket");
      }
    },
  });

const onboardNewCustomerTool = (orgId: string, userId: string) =>
  tool({
    description: `Set up a new customer with standard onboarding tasks and health score.

This workflow:
1. Ensures account is marked as CUSTOMER
2. Creates health score record
3. Creates standard onboarding tasks
4. Sets up renewal tracking

Example: "Onboard Acme Corp as new customer with $50k ARR"`,
    parameters: z.object({
      accountId: z.string().uuid().describe("Account ID to onboard"),
      contractValue: z.number().positive().describe("Annual contract value"),
      contractStartDate: z.string().optional().describe("Contract start date (default: today)"),
      contractMonths: z.number().min(1).max(60).default(12).describe("Contract length in months (default: 12)"),
      csManagerId: z.string().optional().describe("Customer Success manager user ID"),
    }),
    execute: async ({ accountId, contractValue, contractStartDate, contractMonths = 12, csManagerId }) => {
      logToolExecution("onboardNewCustomer", { accountId, contractValue, contractMonths });
      try {
        const account = await prisma.account.findFirst({
          where: { id: accountId, orgId },
        });

        if (!account) {
          return { success: false, message: "Account not found", errorCode: "NOT_FOUND" as const };
        }

        const startDate = contractStartDate ? new Date(contractStartDate) : new Date();
        const renewalDate = new Date(startDate);
        renewalDate.setMonth(renewalDate.getMonth() + contractMonths);

        const result = await prisma.$transaction(async (tx) => {
          // 1. Update account
          await tx.account.update({
            where: { id: accountId },
            data: {
              type: "CUSTOMER",
              assignedToId: csManagerId || account.assignedToId,
            },
          });

          // 2. Create health score
          const healthScore = await tx.healthScore.create({
            data: {
              orgId,
              accountId,
              overallScore: 80, // Start healthy
              usageScore: 70,
              engagementScore: 80,
              supportScore: 90,
              trend: "STABLE",
              lastCalculatedAt: new Date(),
            },
          });

          // 3. Create renewal
          const renewal = await tx.renewal.create({
            data: {
              orgId,
              accountId,
              renewalDate,
              currentValue: contractValue,
              status: "PENDING",
              probability: 90,
              assignedToId: csManagerId || account.assignedToId,
            },
          });

          // 4. Create onboarding tasks
          const tasks = [];
          const taskDefs = [
            { title: "Welcome call", days: 1, type: "CALL" as const },
            { title: "Product training session", days: 3, type: "MEETING" as const },
            { title: "Check-in on initial setup", days: 7, type: "FOLLOW_UP" as const },
            { title: "First month review", days: 30, type: "MEETING" as const },
          ];

          for (const def of taskDefs) {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + def.days);

            const task = await tx.task.create({
              data: {
                orgId,
                title: `${account.name}: ${def.title}`,
                type: def.type,
                status: "PENDING",
                dueDate,
                accountId,
                assignedToId: csManagerId || account.assignedToId,
                createdById: userId,
              },
            });
            tasks.push(task);
          }

          return { healthScore, renewal, tasks };
        });

        await createAuditLog({
          orgId,
          action: "CREATE",
          module: "ACCOUNT",
          recordId: accountId,
          actorType: "AI_AGENT",
          actorId: userId,
          metadata: {
            workflow: "onboardNewCustomer",
            contractValue,
            renewalDate: renewalDate.toISOString(),
            tasksCreated: result.tasks.length,
          },
        });

        return {
          success: true,
          message: `Onboarded ${account.name} as new customer. Created ${result.tasks.length} onboarding tasks and set renewal for ${renewalDate.toLocaleDateString()}.`,
          accountId,
          renewalId: result.renewal.id,
          healthScoreId: result.healthScore.id,
          taskIds: result.tasks.map(t => t.id),
          renewalDate: renewalDate.toISOString(),
        };
      } catch (error) {
        return handleToolError(error, "onboardNewCustomer");
      }
    },
  });
