"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface OpportunityActionsProps {
  opportunityId: string;
  opportunityName: string;
  isClosed: boolean;
}

export function OpportunityActions({
  opportunityId,
  opportunityName,
  isClosed,
}: OpportunityActionsProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${opportunityName}"?`)) return;

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Opportunity deleted");
      router.push("/opportunities");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete opportunity");
    }
  };

  const handleClose = async (won: boolean) => {
    const action = won ? "mark as won" : "mark as lost";
    if (!confirm(`Are you sure you want to ${action} "${opportunityName}"?`)) return;

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closedWon: won,
          actualCloseDate: new Date(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success(won ? "Opportunity marked as won!" : "Opportunity marked as lost");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update opportunity");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isClosed && (
          <>
            <DropdownMenuItem
              onClick={() => handleClose(true)}
              className="text-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Won
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleClose(false)}
              className="text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark as Lost
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Opportunity
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
