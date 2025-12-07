import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { updateTaskSchema } from "@/lib/validation/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a single task
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: { id, orgId: auth.orgId },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        account: {
          select: { id: true, name: true },
        },
        opportunity: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate update data
    const validationResult = updateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get existing task
    const existingTask = await prisma.task.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Handle completion
    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "COMPLETED" && existingTask.status !== "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== "COMPLETED") {
      updateData.completedAt = null;
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "UPDATE",
      module: "TASK",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingTask as unknown as Record<string, unknown>,
      newState: updatedTask as unknown as Record<string, unknown>,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing task
    const existingTask = await prisma.task.findFirst({
      where: { id, orgId: auth.orgId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete task
    await prisma.task.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      orgId: auth.orgId,
      action: "DELETE",
      module: "TASK",
      recordId: id,
      actorType: "USER",
      actorId: auth.userId,
      previousState: existingTask as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
