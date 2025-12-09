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
import { MoreHorizontal, Edit, Trash2, Copy, Power, PowerOff, Loader2 } from "lucide-react";

interface Form {
  id: string;
  name: string;
  isActive: boolean;
}

interface FormActionsProps {
  form: Form;
}

export function FormActions({ form }: FormActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleActive = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/marketing/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !form.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update form");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating form:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/marketing/forms/${form.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete form");
      }

      router.push("/marketing/forms");
    } catch (error) {
      console.error("Error deleting form:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={toggleActive} disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : form.isActive ? (
            <PowerOff className="h-4 w-4 mr-2" />
          ) : (
            <Power className="h-4 w-4 mr-2" />
          )}
          {form.isActive ? "Deactivate" : "Activate"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit Form
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Form
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{form.name}"? This will also delete all submissions. This action cannot be undone.
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
