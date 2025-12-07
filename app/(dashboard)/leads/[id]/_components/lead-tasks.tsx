"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Plus, Loader2, Calendar, Clock } from "lucide-react";
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
}

interface LeadTasksProps {
  tasks: Task[];
  leadId: string;
  orgId: string;
  userId: string;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-500",
  MEDIUM: "bg-blue-500/10 text-blue-500",
  HIGH: "bg-orange-500/10 text-orange-500",
  URGENT: "bg-red-500/10 text-red-500",
};

export function LeadTasks({ tasks, leadId, orgId, userId }: LeadTasksProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "MEDIUM",
  });

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          priority: newTask.priority,
          leadId,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      setNewTask({ title: "", priority: "MEDIUM" });
      setShowForm(false);
      toast.success("Task added successfully");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Failed to add task");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "COMPLETED" : "PENDING",
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      toast.success(completed ? "Task completed!" : "Task reopened");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const pendingTasks = tasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS"
  );
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Add Task Button/Form */}
        {showForm ? (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <Input
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) =>
                setNewTask((prev) => ({ ...prev, title: e.target.value }))
              }
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Select
                value={newTask.priority}
                onValueChange={(value) =>
                  setNewTask((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddTask}
                disabled={!newTask.title.trim() || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add Task"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-sm">Add a task to track follow-ups</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                  />
                ))}
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Completed ({completedTasks.length})
                </p>
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskItem({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const isCompleted = task.status === "COMPLETED";
  const isOverdue =
    task.dueDate && isPast(new Date(task.dueDate)) && !isCompleted;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        isCompleted ? "bg-muted/50 opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm ${
            isCompleted ? "line-through text-muted-foreground" : ""
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>
          {task.dueDate && (
            <span
              className={`flex items-center text-xs ${
                isOverdue ? "text-red-500" : "text-muted-foreground"
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
    </div>
  );
}

function formatDueDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isPast(date)) return `Overdue: ${format(date, "MMM d")}`;
  return format(date, "MMM d");
}
