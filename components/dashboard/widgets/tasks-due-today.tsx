"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  priority: string;
  dueDate: string;
  relatedTo?: string;
  relatedType?: string;
  completed: boolean;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function TasksDueTodayWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/tasks-due-today");
        if (response.ok) {
          const result = await response.json();
          setTasks(result.tasks || []);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: completed ? "COMPLETED" : "TODO" }),
      });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed } : t));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>No tasks due today</p>
        <p className="text-sm">You're all caught up! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors",
            task.completed && "opacity-60"
          )}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => toggleTask(task.id, checked as boolean)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", task.completed && "line-through")}>
              {task.title}
            </p>
            {task.relatedTo && (
              <p className="text-xs text-muted-foreground truncate">
                {task.relatedType}: {task.relatedTo}
              </p>
            )}
          </div>
          <Badge className={cn("text-xs shrink-0", priorityColors[task.priority] || "bg-gray-100")}>
            {task.priority}
          </Badge>
        </div>
      ))}
      <Link
        href="/sales/tasks"
        className="block text-center text-sm text-primary hover:underline pt-2"
      >
        View all tasks
      </Link>
    </div>
  );
}
