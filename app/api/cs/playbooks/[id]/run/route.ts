import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { addDays } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PlaybookStep {
  order: number;
  dayOffset: number;
  title: string;
  description?: string;
  taskType: string;
  assigneeType: string;
}

const runSchema = z.object({
  accountId: z.string().uuid(),
});

// POST /api/cs/playbooks/[id]/run - Start a playbook for an account
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orgId, userId } = await getAuthContext();
    const { id } = await params;
    const body = await request.json();

    const data = runSchema.parse(body);

    // Get playbook
    const playbook = await prisma.playbook.findFirst({
      where: { id, orgId, isActive: true },
    });

    if (!playbook) {
      return NextResponse.json(
        { error: "Playbook not found or inactive" },
        { status: 404 }
      );
    }

    // Verify account belongs to org
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, orgId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const steps = (playbook.steps as unknown as PlaybookStep[]) || [];
    const startDate = new Date();

    // Create playbook run
    const run = await prisma.playbookRun.create({
      data: {
        orgId,
        playbookId: playbook.id,
        accountId: data.accountId,
        status: "IN_PROGRESS",
        currentStep: 1,
        totalSteps: steps.length,
        startedById: userId,
        metadata: { taskIds: [] },
      },
    });

    // Create tasks for each step
    const taskIds: string[] = [];

    for (const step of steps) {
      // Determine assignee based on assigneeType
      let assignedToId: string | null = null;
      if (step.assigneeType === "CSM" || step.assigneeType === "ACCOUNT_OWNER") {
        assignedToId = account.assignedToId;
      } else if (step.assigneeType === "CREATOR") {
        assignedToId = userId;
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
          accountId: data.accountId,
          assignedToId,
          createdById: userId,
          createdByType: "USER",
        },
      });

      taskIds.push(task.id);
    }

    // Update run with task IDs
    await prisma.playbookRun.update({
      where: { id: run.id },
      data: {
        metadata: { taskIds },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        orgId,
        type: "PLAYBOOK_STARTED",
        subject: `Playbook started: ${playbook.name}`,
        description: `Started playbook for ${account.name} with ${steps.length} steps`,
        workspace: "cs",
        accountId: data.accountId,
        performedById: userId,
        performedByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "PLAYBOOK_RUN",
      recordId: run.id,
      actorType: "USER",
      actorId: userId,
      newState: { ...run, taskIds } as unknown as Record<string, unknown>,
      metadata: {
        playbookId: playbook.id,
        playbookName: playbook.name,
        accountId: data.accountId,
        accountName: account.name,
      },
    });

    return NextResponse.json({ 
      run,
      tasksCreated: taskIds.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to start playbook:", error);
    return NextResponse.json(
      { error: "Failed to start playbook" },
      { status: 500 }
    );
  }
}
