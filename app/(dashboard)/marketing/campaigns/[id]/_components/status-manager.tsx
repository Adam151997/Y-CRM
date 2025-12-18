"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusManagerProps {
  campaignId: string;
  currentStatus: string;
}

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-slate-500", order: 0 },
  SCHEDULED: { label: "Scheduled", color: "bg-blue-500", order: 1 },
  ACTIVE: { label: "Active", color: "bg-green-500", order: 2 },
  PAUSED: { label: "Paused", color: "bg-yellow-500", order: 2.5 },
  COMPLETED: { label: "Completed", color: "bg-purple-500", order: 3 },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", order: -1 },
};

const statusTransitions: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "ACTIVE", "CANCELLED"],
  SCHEDULED: ["DRAFT", "ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [], // Terminal state
  CANCELLED: ["DRAFT"], // Can restart
};

export function StatusManager({ campaignId, currentStatus }: StatusManagerProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const allowedTransitions = statusTransitions[currentStatus] || [];

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;

    setIsUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: pendingStatus };

      // Set timestamps based on status
      if (pendingStatus === "ACTIVE" && currentStatus !== "PAUSED") {
        updateData.startedAt = new Date().toISOString();
      }
      if (pendingStatus === "COMPLETED") {
        updateData.completedAt = new Date().toISOString();
      }
      if (pendingStatus === "DRAFT") {
        // Reset timestamps when going back to draft
        updateData.startedAt = null;
        updateData.completedAt = null;
        updateData.scheduledAt = null;
      }

      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
      setPendingStatus(null);
    }
  };

  // Status timeline steps
  const timelineSteps = ["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED"];
  const currentOrder = statusConfig[currentStatus as keyof typeof statusConfig]?.order ?? 0;

  return (
    <div className="space-y-4">
      {/* Status Timeline */}
      <div className="flex items-center justify-between">
        {timelineSteps.map((step, index) => {
          const config = statusConfig[step as keyof typeof statusConfig];
          const stepOrder = config.order;
          const isComplete = currentOrder > stepOrder || (currentStatus === step && step === "COMPLETED");
          const isCurrent = currentStatus === step;
          const isPaused = currentStatus === "PAUSED" && step === "ACTIVE";
          const isCancelled = currentStatus === "CANCELLED";

          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isComplete && "bg-green-500 border-green-500 text-white",
                    isCurrent && !isComplete && "border-primary bg-primary text-white",
                    isPaused && "border-yellow-500 bg-yellow-500 text-white",
                    isCancelled && step === "DRAFT" && "border-red-500 bg-red-500 text-white",
                    !isComplete && !isCurrent && !isPaused && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isCancelled && step === "DRAFT" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-1",
                  (isCurrent || isComplete) ? "font-medium" : "text-muted-foreground"
                )}>
                  {config.label}
                </span>
              </div>
              {index < timelineSteps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    currentOrder > stepOrder ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Status:</span>
          <Badge className={cn(
            "text-white",
            statusConfig[currentStatus as keyof typeof statusConfig]?.color
          )}>
            {statusConfig[currentStatus as keyof typeof statusConfig]?.label || currentStatus}
          </Badge>
        </div>

        {/* Status Change Dropdown */}
        {allowedTransitions.length > 0 && (
          <Select onValueChange={handleStatusChange} disabled={isUpdating}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {allowedTransitions.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusConfig[status as keyof typeof statusConfig]?.label || status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Campaign Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status from{" "}
              <strong>{statusConfig[currentStatus as keyof typeof statusConfig]?.label}</strong> to{" "}
              <strong>{pendingStatus && statusConfig[pendingStatus as keyof typeof statusConfig]?.label}</strong>?
              {pendingStatus === "CANCELLED" && (
                <span className="block mt-2 text-destructive">
                  Cancelling a campaign cannot be easily undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
