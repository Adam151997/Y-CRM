"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Calendar, Clock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
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

interface ContactTasksProps {
  contactId: string;
  tasks: Task[];
  userId: string;
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-500/20",
  CANCELLED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function ContactTasks({ contactId, tasks, userId }: ContactTasksProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "MEDIUM",
    dueDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          priority: newTask.priority,
          dueDate: newTask.dueDate || null,
          contactId,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      toast.success("Task added");
      setNewTask({ title: "", priority: "MEDIUM", dueDate: "" });
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to add task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      router.refresh();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div className="space-y-4">
      {/* Add Task Button/Form */}
      {isAdding ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={newTask.priority}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) =>
                  setNewTask({ ...newTask, dueDate: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTask} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Task
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewTask({ title: "", priority: "MEDIUM", dueDate: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tasks yet. Add your first task above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.status === "COMPLETED"}
                        onCheckedChange={() =>
                          handleToggleComplete(task.id, task.status)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          <div
                            className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}
                            title={task.priority}
                          />
                        </div>
                        {task.dueDate && (
                          <p
                            className={`text-xs flex items-center gap-1 mt-1 ${
                              isPast(new Date(task.dueDate)) &&
                              task.status !== "COMPLETED"
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isToday(new Date(task.dueDate)) ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <Calendar className="h-3 w-3" />
                            )}
                            {isToday(new Date(task.dueDate))
                              ? "Today"
                              : format(new Date(task.dueDate), "MMM d")}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={statusColors[task.status]}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">
                Completed ({completedTasks.length})
              </p>
              {completedTasks.map((task) => (
                <Card key={task.id} className="opacity-60">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() =>
                          handleToggleComplete(task.id, task.status)
                        }
                      />
                      <p className="line-through text-muted-foreground">
                        {task.title}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
