"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, CheckSquare, Calendar } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  priority: string;
  status: string;
}

interface OpportunityTasksProps {
  opportunityId: string;
  initialTasks: Task[];
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

export function OpportunityTasks({ opportunityId, initialTasks }: OpportunityTasksProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask,
          opportunityId,
          priority: "MEDIUM",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const task = await response.json();
      setTasks([...tasks, task]);
      setNewTask("");
      setShowForm(false);
      toast.success("Task created");
      router.refresh();
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          completedAt: new Date(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success("Task completed");
      router.refresh();
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Enter task title..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={isSubmitting || !newTask.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setNewTask("");
              }}
            >
              Cancel
            </Button>
          </form>
        )}

        {tasks.length === 0 && !showForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  onCheckedChange={() => handleComplete(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium hover:underline line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span
                        className={`text-xs ${
                          isPast(new Date(task.dueDate)) && task.status !== "COMPLETED"
                            ? "text-red-500"
                            : isToday(new Date(task.dueDate))
                            ? "text-orange-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}
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
