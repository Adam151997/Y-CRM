"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CanAccess } from "@/components/can-access";
import { usePermissions } from "@/hooks/use-permissions";
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
  Mail,
  Phone,
  ArrowRightCircle,
  UserX,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
}

interface LeadActionsProps {
  lead: Lead;
}

export function LeadActions({ lead }: LeadActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { can } = usePermissions();

  // Check permissions
  const canEdit = can("leads", "edit");
  const canDelete = can("leads", "delete");

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          convertedAt: newStatus === "CONVERTED" ? new Date().toISOString() : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast.success(`Lead marked as ${newStatus.toLowerCase()}`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("Failed to update lead status");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Lead deleted successfully");
      router.push("/leads");
    } catch (error) {
      toast.error("Failed to delete lead");
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
          {lead.email && (
            <DropdownMenuItem asChild>
              <a href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </a>
            </DropdownMenuItem>
          )}
          {lead.phone && (
            <DropdownMenuItem asChild>
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </a>
            </DropdownMenuItem>
          )}
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              {lead.status !== "CONVERTED" && (
                <DropdownMenuItem onClick={() => handleStatusChange("CONVERTED")}>
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                  Mark as Converted
                </DropdownMenuItem>
              )}
              {lead.status !== "LOST" && (
                <DropdownMenuItem onClick={() => handleStatusChange("LOST")}>
                  <UserX className="h-4 w-4 mr-2" />
                  Mark as Lost
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lead
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {lead.firstName} {lead.lastName}?
              This action cannot be undone. All notes, tasks, and activities
              associated with this lead will also be deleted.
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
