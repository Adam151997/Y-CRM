import prisma from "@/lib/db";
import { addDays } from "date-fns";

/**
 * Playbook Trigger Engine
 * 
 * Handles automatic execution of playbooks based on triggers:
 * - NEW_CUSTOMER: When account type changes to CUSTOMER
 * - RENEWAL_APPROACHING: X days before renewal end date
 * - HEALTH_DROP: When health score drops below threshold
 * - TICKET_ESCALATION: When ticket priority becomes URGENT
 */

interface TriggerConfig {
  daysBeforeRenewal?: number;
  healthScoreThreshold?: number;
}

interface PlaybookStep {
  order: number;
  dayOffset: number;
  title: string;
  description?: string;
  taskType: string;
  assigneeType: string;
}

/**
 * Start a playbook for an account
 */
async function startPlaybookForAccount(
  orgId: string,
  playbookId: string,
  accountId: string,
  triggeredBy: string = "SYSTEM"
): Promise<{ success: boolean; runId?: string; error?: string }> {
  try {
    // Get playbook
    const playbook = await prisma.playbook.findFirst({
      where: { id: playbookId, orgId, isActive: true },
    });

    if (!playbook) {
      return { success: false, error: "Playbook not found or inactive" };
    }

    // Get account
    const account = await prisma.account.findFirst({
      where: { id: accountId, orgId },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    // Check if playbook is already running for this account
    const existingRun = await prisma.playbookRun.findFirst({
      where: {
        playbookId,
        accountId,
        status: "IN_PROGRESS",
      },
    });

    if (existingRun) {
      return { success: false, error: "Playbook already running for this account" };
    }

    const steps = (playbook.steps as unknown as PlaybookStep[]) || [];
    const startDate = new Date();

    // Create playbook run
    const run = await prisma.playbookRun.create({
      data: {
        orgId,
        playbookId,
        accountId,
        status: "IN_PROGRESS",
        currentStep: 1,
        totalSteps: steps.length,
        startedById: triggeredBy,
        metadata: { taskIds: [], trigger: playbook.trigger },
      },
    });

    // Create tasks for each step
    const taskIds: string[] = [];

    for (const step of steps) {
      let assignedToId: string | null = null;
      if (step.assigneeType === "CSM" || step.assigneeType === "ACCOUNT_OWNER") {
        assignedToId = account.assignedToId;
      }

      const dueDate = addDays(startDate, step.dayOffset);

      const task = await prisma.task.create({
        data: {
          orgId,
          title: `[${playbook.name}] ${step.title}`,
          description: step.description || `Playbook step ${step.order} of ${steps.length}`,
          dueDate,
          priority: "MEDIUM",
          status: "PENDING",
          taskType: step.taskType,
          workspace: "cs",
          accountId,
          assignedToId,
          createdById: triggeredBy,
          createdByType: "SYSTEM",
        },
      });

      taskIds.push(task.id);
    }

    // Update run with task IDs
    await prisma.playbookRun.update({
      where: { id: run.id },
      data: {
        metadata: { taskIds, trigger: playbook.trigger },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        orgId,
        type: "PLAYBOOK_STARTED",
        subject: `Playbook auto-started: ${playbook.name}`,
        description: `Triggered by ${playbook.trigger} with ${steps.length} steps`,
        workspace: "cs",
        accountId,
        performedById: triggeredBy,
        performedByType: "SYSTEM",
      },
    });

    return { success: true, runId: run.id };
  } catch (error) {
    console.error("Failed to start playbook:", error);
    return { success: false, error: "Failed to start playbook" };
  }
}

/**
 * Trigger: NEW_CUSTOMER
 * Called when an account's type changes to CUSTOMER
 */
export async function triggerNewCustomerPlaybooks(
  orgId: string,
  accountId: string
): Promise<void> {
  const playbooks = await prisma.playbook.findMany({
    where: {
      orgId,
      trigger: "NEW_CUSTOMER",
      isActive: true,
    },
  });

  for (const playbook of playbooks) {
    await startPlaybookForAccount(orgId, playbook.id, accountId, "SYSTEM");
  }
}

/**
 * Trigger: HEALTH_DROP
 * Called when account health score drops below threshold
 */
export async function triggerHealthDropPlaybooks(
  orgId: string,
  accountId: string,
  newScore: number,
  previousScore: number | null
): Promise<void> {
  // Only trigger if score actually dropped
  if (previousScore === null || newScore >= previousScore) {
    return;
  }

  const playbooks = await prisma.playbook.findMany({
    where: {
      orgId,
      trigger: "HEALTH_DROP",
      isActive: true,
    },
  });

  for (const playbook of playbooks) {
    const config = (playbook.triggerConfig as TriggerConfig) || {};
    const threshold = config.healthScoreThreshold || 40;

    // Trigger if score dropped below threshold
    if (newScore < threshold && (previousScore === null || previousScore >= threshold)) {
      await startPlaybookForAccount(orgId, playbook.id, accountId, "SYSTEM");
    }
  }
}

/**
 * Trigger: TICKET_ESCALATION
 * Called when a ticket priority changes to URGENT
 */
export async function triggerTicketEscalationPlaybooks(
  orgId: string,
  accountId: string,
  ticketId: string
): Promise<void> {
  const playbooks = await prisma.playbook.findMany({
    where: {
      orgId,
      trigger: "TICKET_ESCALATION",
      isActive: true,
    },
  });

  for (const playbook of playbooks) {
    await startPlaybookForAccount(orgId, playbook.id, accountId, "SYSTEM");
  }
}

/**
 * Trigger: RENEWAL_APPROACHING
 * Called periodically to check for approaching renewals
 * This should be called by a cron job
 */
export async function checkAndTriggerRenewalPlaybooks(
  orgId: string
): Promise<{ triggered: number }> {
  const playbooks = await prisma.playbook.findMany({
    where: {
      orgId,
      trigger: "RENEWAL_APPROACHING",
      isActive: true,
    },
  });

  let triggered = 0;

  for (const playbook of playbooks) {
    const config = (playbook.triggerConfig as TriggerConfig) || {};
    const daysBeforeRenewal = config.daysBeforeRenewal || 90;

    // Find renewals approaching within the configured window
    const targetDate = addDays(new Date(), daysBeforeRenewal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const approachingRenewals = await prisma.renewal.findMany({
      where: {
        orgId,
        status: { in: ["UPCOMING", "IN_PROGRESS"] },
        endDate: {
          gte: today,
          lte: targetDate,
        },
      },
    });

    for (const renewal of approachingRenewals) {
      // Check if playbook already running for this account
      const existingRun = await prisma.playbookRun.findFirst({
        where: {
          playbookId: playbook.id,
          accountId: renewal.accountId,
          status: "IN_PROGRESS",
        },
      });

      if (!existingRun) {
        const result = await startPlaybookForAccount(
          orgId, 
          playbook.id, 
          renewal.accountId, 
          "SYSTEM"
        );
        if (result.success) {
          triggered++;
        }
      }
    }
  }

  return { triggered };
}

/**
 * Run all periodic trigger checks for an organization
 * This should be called by a cron job
 */
export async function runPeriodicTriggerChecks(
  orgId: string
): Promise<{ renewalTriggered: number }> {
  const renewalResult = await checkAndTriggerRenewalPlaybooks(orgId);
  
  return {
    renewalTriggered: renewalResult.triggered,
  };
}

/**
 * Run periodic trigger checks for all organizations
 * This is the main entry point for cron jobs
 */
export async function runAllOrganizationTriggerChecks(): Promise<{
  orgsProcessed: number;
  totalTriggered: number;
}> {
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  let totalTriggered = 0;

  for (const org of organizations) {
    const result = await runPeriodicTriggerChecks(org.id);
    totalTriggered += result.renewalTriggered;
  }

  return {
    orgsProcessed: organizations.length,
    totalTriggered,
  };
}
