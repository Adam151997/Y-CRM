"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  status: string;
}

interface AccountTasksProps {
  accountId: string;
  initialTasks: Task[];
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

function formatDueDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isPast(date)) return `Overdue: ${format(date, "MMM d")}`;
  return format(date, "MMM d");
}

export function AccountTasks({ accountId, initialTasks }: AccountTasksProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "COMPLETED" : "PENDING",
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      if (completed) {
        setTasks(tasks.filter((t) => t.id !== taskId));
        toast.success("Task completed!");
      }
      router.refresh();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks</CardTitle>
        <Button size="sm" asChild>
          <Link href={`/tasks/new?accountId=${accountId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No pending tasks</p>
            <Button variant="link" asChild>
              <Link href={`/tasks/new?accountId=${accountId}`}>Create a task</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  className="mt-1"
                  onCheckedChange={(checked) =>
                    handleToggleComplete(task.id, checked as boolean)
                  }
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/tasks/${task.id}`} className="hover:underline">
                    <p className="font-medium">{task.title}</p>
                  </Link>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {task.dueDate && (
                      <span
                        className={`flex items-center text-xs ${
                          isPast(new Date(task.dueDate)) ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        {isToday(new Date(task.dueDate)) ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : (
                          <Calendar className="h-3 w-3 mr-1" />
                        )}
                        {formatDueDate(new Date(task.dueDate))}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${priorityColors[task.priority]}`}
                  title={task.priority}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
