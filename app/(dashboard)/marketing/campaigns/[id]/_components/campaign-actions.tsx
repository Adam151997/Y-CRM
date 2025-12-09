"use client";

import { useState } from "react";
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
import { MoreHorizontal, Play, Pause, Edit, Trash2, Copy, Loader2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface CampaignActionsProps {
  campaign: Campaign;
}

export function CampaignActions({ campaign }: CampaignActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          ...(newStatus === "ACTIVE" ? { startedAt: new Date().toISOString() } : {}),
          ...(newStatus === "COMPLETED" ? { completedAt: new Date().toISOString() } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating campaign:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaign.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }

      router.push("/marketing/campaigns");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      setIsDeleting(false);
    }
  };

  const canStart = campaign.status === "DRAFT" || campaign.status === "SCHEDULED";
  const canPause = campaign.status === "ACTIVE";
  const canResume = campaign.status === "PAUSED";
  const canComplete = campaign.status === "ACTIVE" || campaign.status === "PAUSED";

  return (
    <>
      <div className="flex items-center gap-2">
        {canStart && (
          <Button onClick={() => updateStatus("ACTIVE")} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Launch
          </Button>
        )}
        {canPause && (
          <Button variant="outline" onClick={() => updateStatus("PAUSED")} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            Pause
          </Button>
        )}
        {canResume && (
          <Button onClick={() => updateStatus("ACTIVE")} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Resume
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit Campaign
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {canComplete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateStatus("COMPLETED")}>
                  Mark as Completed
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Campaign
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
