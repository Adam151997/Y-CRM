"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  User,
  Building2,
  Target,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  status: string;
  taskType: string | null;
  lead: { id: string; firstName: string; lastName: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  account: { id: string; name: string } | null;
  opportunity: { id: string; name: string } | null;
}

interface TasksListProps {
  tasks: Task[];
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  LOW: { color: "bg-slate-500", label: "Low" },
  MEDIUM: { color: "bg-blue-500", label: "Medium" },
  HIGH: { color: "bg-orange-500", label: "High" },
  URGENT: { color: "bg-red-500", label: "Urgent" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  PENDING: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Pending" },
  IN_PROGRESS: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "In Progress" },
  COMPLETED: { color: "bg-green-500/10 text-green-600 border-green-500/20", label: "Completed" },
  CANCELLED: { color: "bg-slate-500/10 text-slate-600 border-slate-500/20", label: "Cancelled" },
};

function formatDueDate(date: Date): { text: string; isOverdue: boolean } {
  const d = new Date(date);
  if (isToday(d)) return { text: "Today", isOverdue: false };
  if (isTomorrow(d)) return { text: "Tomorrow", isOverdue: false };
  if (isPast(d)) return { text: `Overdue: ${format(d, "MMM d")}`, isOverdue: true };
  return { text: format(d, "MMM d, yyyy"), isOverdue: false };
}

export function TasksList({ tasks }: TasksListProps) {
  const router = useRouter();

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "COMPLETED" : "PENDING",
        }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      toast.success(completed ? "Task completed!" : "Task reopened");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");

      toast.success("Task deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No tasks found</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/tasks/new">Create your first task</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
        const status = statusConfig[task.status] || statusConfig.PENDING;
        const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
        const isCompleted = task.status === "COMPLETED";

        // Get related entity
        const relatedEntity = task.lead
          ? { type: "lead", name: `${task.lead.firstName} ${task.lead.lastName}`, href: `/leads/${task.lead.id}`, icon: User }
          : task.contact
            ? { type: "contact", name: `${task.contact.firstName} ${task.contact.lastName}`, href: `/contacts/${task.contact.id}`, icon: User }
            : task.account
              ? { type: "account", name: task.account.name, href: `/accounts/${task.account.id}`, icon: Building2 }
              : task.opportunity
                ? { type: "opportunity", name: task.opportunity.name, href: `/opportunities/${task.opportunity.id}`, icon: Target }
                : null;

        return (
          <Card key={task.id} className="group">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    handleToggleComplete(task.id, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Link
                        href={`/tasks/${task.id}`}
                        className={`font-medium hover:underline ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                      >
                        {task.title}
                      </Link>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {dueInfo && (
                          <span
                            className={`flex items-center text-xs ${
                              dueInfo.isOverdue && !isCompleted
                                ? "text-red-500 font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isToday(new Date(task.dueDate!)) ? (
                              <Clock className="h-3 w-3 mr-1" />
                            ) : (
                              <Calendar className="h-3 w-3 mr-1" />
                            )}
                            {dueInfo.text}
                          </span>
                        )}
                        {task.taskType && (
                          <Badge variant="outline" className="text-xs">
                            {task.taskType}
                          </Badge>
                        )}
                        {relatedEntity && (
                          <Link
                            href={relatedEntity.href}
                            className="flex items-center text-xs text-muted-foreground hover:text-foreground"
                          >
                            <relatedEntity.icon className="h-3 w-3 mr-1" />
                            {relatedEntity.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${priority.color}`}
                        title={priority.label}
                      />
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
