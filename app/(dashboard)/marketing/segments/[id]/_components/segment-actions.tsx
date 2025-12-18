"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Edit, Trash2, Copy, Power, PowerOff, Loader2, Plus, X } from "lucide-react";

interface SegmentRule {
  field: string;
  operator: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  type: string;
  targetEntity: string;
  rules: unknown; // JsonValue from Prisma
  ruleLogic: string;
}

interface SegmentActionsProps {
  segment: Segment;
}

const CONTACT_FIELDS = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "phone", label: "Phone" },
  { value: "title", label: "Title" },
  { value: "department", label: "Department" },
  { value: "company", label: "Company Name" },
  { value: "industry", label: "Industry" },
  { value: "accountType", label: "Account Type" },
  { value: "createdAt", label: "Created Date" },
];

const LEAD_FIELDS = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "phone", label: "Phone" },
  { value: "title", label: "Title" },
  { value: "company", label: "Company" },
  { value: "source", label: "Lead Source" },
  { value: "status", label: "Lead Status" },
  { value: "createdAt", label: "Created Date" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

export function SegmentActions({ segment }: SegmentActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: segment.name,
    description: segment.description || "",
    targetEntity: segment.targetEntity,
    ruleLogic: segment.ruleLogic || "AND",
    rules: (Array.isArray(segment.rules) ? segment.rules : []) as SegmentRule[],
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (showEditDialog) {
      setEditForm({
        name: segment.name,
        description: segment.description || "",
        targetEntity: segment.targetEntity,
        ruleLogic: segment.ruleLogic || "AND",
        rules: (Array.isArray(segment.rules) ? segment.rules : []) as SegmentRule[],
      });
    }
  }, [showEditDialog, segment]);

  const fieldOptions = editForm.targetEntity === "LEAD" ? LEAD_FIELDS : CONTACT_FIELDS;

  const toggleActive = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/marketing/segments/${segment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !segment.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update segment");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating segment:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/marketing/segments/${segment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete segment");
      }

      router.push("/marketing/segments");
    } catch (error) {
      console.error("Error deleting segment:", error);
      alert(error instanceof Error ? error.message : "Failed to delete segment");
      setIsDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.name.trim()) {
      alert("Segment name is required");
      return;
    }

    if (segment.type === "DYNAMIC" && editForm.rules.length === 0) {
      alert("At least one rule is required for dynamic segments");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/marketing/segments/${segment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          targetEntity: editForm.targetEntity,
          ruleLogic: editForm.ruleLogic,
          rules: editForm.rules,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update segment");
      }

      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating segment:", error);
      alert("Failed to update segment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const addRule = () => {
    setEditForm({
      ...editForm,
      rules: [...editForm.rules, { field: "", operator: "equals", value: "" }],
    });
  };

  const removeRule = (index: number) => {
    setEditForm({
      ...editForm,
      rules: editForm.rules.filter((_, i) => i !== index),
    });
  };

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    setEditForm({
      ...editForm,
      rules: editForm.rules.map((rule, i) => 
        i === index ? { ...rule, ...updates } : rule
      ),
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={toggleActive} disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : segment.isActive ? (
            <PowerOff className="h-4 w-4 mr-2" />
          ) : (
            <Power className="h-4 w-4 mr-2" />
          )}
          {segment.isActive ? "Deactivate" : "Activate"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Segment
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
              Delete Segment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
            <DialogDescription>
              Update segment details and rules
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Segment Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., High-Value Customers"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-entity">Target Entity</Label>
                <Select
                  value={editForm.targetEntity}
                  onValueChange={(value) => setEditForm({ 
                    ...editForm, 
                    targetEntity: value,
                    rules: [] // Reset rules when entity changes
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTACT">Contacts</SelectItem>
                    <SelectItem value="LEAD">Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description of this segment..."
                rows={2}
              />
            </div>

            {/* Rules Section - Only for Dynamic Segments */}
            {segment.type === "DYNAMIC" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Segment Rules</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={editForm.ruleLogic}
                      onValueChange={(value) => setEditForm({ ...editForm, ruleLogic: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={addRule}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Rule
                    </Button>
                  </div>
                </div>

                {editForm.rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rules defined. Add rules to filter {editForm.targetEntity.toLowerCase()}s.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {editForm.rules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Select
                          value={rule.field}
                          onValueChange={(value) => updateRule(index, { field: value })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptions.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={rule.operator}
                          onValueChange={(value) => updateRule(index, { operator: value })}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                          <Input
                            value={rule.value}
                            onChange={(e) => updateRule(index, { value: e.target.value })}
                            placeholder="Value"
                            className="flex-1"
                          />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRule(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Segment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{segment.name}&quot;? This action cannot be undone.
              Note: Segments used by campaigns cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
