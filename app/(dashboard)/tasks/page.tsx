import { Suspense } from "react";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TasksList } from "./_components/tasks-list";
import { TasksFilters } from "./_components/tasks-filters";

interface TasksPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    view?: string;
  }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { orgId, userId } = await getAuthContext();
  const params = await searchParams;

  const status = params.status;
  const priority = params.priority;
  const view = params.view || "all"; // all, my, overdue

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  
  if (status && status !== "_all") {
    where.status = status;
  } else if (!status) {
    // Default: show non-completed tasks
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
  }
  
  if (priority && priority !== "_all") {
    where.priority = priority;
  }

  if (view === "my") {
    where.assignedToId = userId;
  } else if (view === "overdue") {
    where.dueDate = { lt: new Date() };
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
  }

  // Fetch tasks
  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { priority: "desc" },
    ],
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

  // Get task counts
  const [totalTasks, pendingTasks, overdueTasks] = await Promise.all([
    prisma.task.count({ where: { orgId } }),
    prisma.task.count({ where: { orgId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.task.count({
      where: {
        orgId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            {pendingTasks} pending • {overdueTasks} overdue • {totalTasks} total
          </p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <TasksFilters
        currentStatus={params.status}
        currentPriority={params.priority}
        currentView={view}
      />

      {/* Tasks List */}
      <Suspense fallback={<div>Loading tasks...</div>}>
        <TasksList tasks={tasks} />
      </Suspense>
    </div>
  );
}
