import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { createTaskSchema } from "@/lib/validation/schemas";

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate
    const validationResult = createTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create task
    const task = await prisma.task.create({
      data: {
        orgId: auth.orgId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        status: data.status,
        taskType: data.taskType,
        leadId: data.leadId,
        contactId: data.contactId,
        accountId: data.accountId,
        opportunityId: data.opportunityId,
        assignedToId: data.assignedToId || auth.userId,
        createdById: auth.userId,
        createdByType: "USER",
      },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "CREATE",
      module: "TASK",
      recordId: task.id,
      actorType: "USER",
      actorId: auth.userId,
      newState: task as unknown as Record<string, unknown>,
    });

    // Create notification
    await createNotification({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "TASK_CREATED",
      title: `Task created: ${task.title}`,
      message: task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : undefined,
      entityType: "TASK",
      entityId: task.id,
    });

    // If assigned to someone else, notify them
    if (data.assignedToId && data.assignedToId !== auth.userId) {
      await createNotification({
        orgId: auth.orgId,
        userId: data.assignedToId,
        type: "TASK_ASSIGNED",
        title: `Task assigned to you: ${task.title}`,
        message: task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : undefined,
        entityType: "TASK",
        entityId: task.id,
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

// GET /api/tasks - Get tasks (with filtering)
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const contactId = searchParams.get("contactId");
    const accountId = searchParams.get("accountId");
    const opportunityId = searchParams.get("opportunityId");
    const status = searchParams.get("status");
    const assignedToId = searchParams.get("assignedToId");

    const where: Record<string, unknown> = { orgId: auth.orgId };
    if (leadId) where.leadId = leadId;
    if (contactId) where.contactId = contactId;
    if (accountId) where.accountId = accountId;
    if (opportunityId) where.opportunityId = opportunityId;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: {
        lead: {
          select: { firstName: true, lastName: true },
        },
        contact: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
