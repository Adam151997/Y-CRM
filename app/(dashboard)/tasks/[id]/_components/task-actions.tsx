"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TaskActionsProps {
  taskId: string;
  taskTitle: string;
  currentStatus: string;
}

export function TaskActions({ taskId, taskTitle, currentStatus }: TaskActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          completedAt: newStatus === "COMPLETED" ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const statusLabels: Record<string, string> = {
        PENDING: "pending",
        IN_PROGRESS: "in progress",
        COMPLETED: "completed",
        CANCELLED: "cancelled",
      };

      toast.success(`Task marked as ${statusLabels[newStatus] || newStatus.toLowerCase()}`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Task deleted successfully");
      router.push("/tasks");
    } catch (error) {
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {currentStatus !== "PENDING" && (
            <DropdownMenuItem onClick={() => handleStatusChange("PENDING")}>
              <Clock className="h-4 w-4 mr-2" />
              Mark as Pending
            </DropdownMenuItem>
          )}
          {currentStatus !== "IN_PROGRESS" && (
            <DropdownMenuItem onClick={() => handleStatusChange("IN_PROGRESS")}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Mark as In Progress
            </DropdownMenuItem>
          )}
          {currentStatus !== "COMPLETED" && (
            <DropdownMenuItem onClick={() => handleStatusChange("COMPLETED")}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Completed
            </DropdownMenuItem>
          )}
          {currentStatus !== "CANCELLED" && (
            <DropdownMenuItem onClick={() => handleStatusChange("CANCELLED")}>
              <XCircle className="h-4 w-4 mr-2" />
              Mark as Cancelled
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{taskTitle}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
