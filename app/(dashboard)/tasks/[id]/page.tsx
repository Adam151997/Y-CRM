import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pencil,
  Calendar,
  Clock,
  CheckSquare,
  User,
  Building2,
  Target,
  ArrowLeft,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { TaskActions } from "./_components/task-actions";

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

const priorityConfig: Record<string, { color: string; label: string; bg: string }> = {
  LOW: { color: "text-slate-600", label: "Low", bg: "bg-slate-500/10" },
  MEDIUM: { color: "text-blue-600", label: "Medium", bg: "bg-blue-500/10" },
  HIGH: { color: "text-orange-600", label: "High", bg: "bg-orange-500/10" },
  URGENT: { color: "text-red-600", label: "Urgent", bg: "bg-red-500/10" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  PENDING: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Pending" },
  IN_PROGRESS: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "In Progress" },
  COMPLETED: { color: "bg-green-500/10 text-green-600 border-green-500/20", label: "Completed" },
  CANCELLED: { color: "bg-slate-500/10 text-slate-600 border-slate-500/20", label: "Cancelled" },
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, orgId },
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
    notFound();
  }

  const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const status = statusConfig[task.status] || statusConfig.PENDING;
  const isOverdue =
    task.dueDate &&
    isPast(new Date(task.dueDate)) &&
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED";

  // Get related entity
  const relatedEntity = task.lead
    ? { type: "Lead", name: `${task.lead.firstName} ${task.lead.lastName}`, href: `/leads/${task.lead.id}`, icon: User }
    : task.contact
      ? { type: "Contact", name: `${task.contact.firstName} ${task.contact.lastName}`, href: `/contacts/${task.contact.id}`, icon: User }
      : task.account
        ? { type: "Account", name: task.account.name, href: `/accounts/${task.account.id}`, icon: Building2 }
        : task.opportunity
          ? { type: "Opportunity", name: task.opportunity.name, href: `/opportunities/${task.opportunity.id}`, icon: Target }
          : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/tasks">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl ${priority.bg} flex items-center justify-center`}>
            <CheckSquare className={`h-6 w-6 ${priority.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight">{task.title}</h2>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
              <Badge variant="outline" className={`${priority.bg} ${priority.color} border-0`}>
                {priority.label} Priority
              </Badge>
            </div>
            {task.taskType && (
              <p className="text-muted-foreground mt-1">
                {task.taskType} Task
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TaskActions taskId={task.id} taskTitle={task.title} currentStatus={task.status} />
          <Button asChild>
            <Link href={`/tasks/${task.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Due Date */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due Date</span>
                {task.dueDate ? (
                  <span className={`flex items-center text-sm font-medium ${isOverdue ? "text-red-500" : ""}`}>
                    {isToday(new Date(task.dueDate)) ? (
                      <Clock className="h-4 w-4 mr-1" />
                    ) : (
                      <Calendar className="h-4 w-4 mr-1" />
                    )}
                    {format(new Date(task.dueDate), "PPP")}
                    {isOverdue && " (Overdue)"}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
              </div>

              {/* Completed At */}
              {task.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-sm">
                    {format(new Date(task.completedAt), "PPP")}
                  </span>
                </div>
              )}

              {/* Created */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {format(new Date(task.createdAt), "PPP")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Related Record */}
          {relatedEntity && (
            <Card>
              <CardHeader>
                <CardTitle>Related {relatedEntity.type}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={relatedEntity.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <relatedEntity.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">{relatedEntity.name}</span>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
