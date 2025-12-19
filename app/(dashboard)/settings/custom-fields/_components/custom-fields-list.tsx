"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, GripVertical, Inbox, Link2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { EditCustomFieldDialog } from "./edit-custom-field-dialog";

interface CustomField {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options: unknown;
  placeholder?: string | null;
  helpText?: string | null;
  displayOrder: number;
  isActive: boolean;
  isSystem: boolean;
  relatedModule?: string | null;
}

interface CustomFieldsListProps {
  fields: CustomField[];
  moduleType: "builtin" | "custom";
  moduleIdentifier: string;
  moduleName?: string;
}

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Text",
  TEXTAREA: "Text Area",
  NUMBER: "Number",
  CURRENCY: "Currency",
  PERCENT: "Percent",
  DATE: "Date",
  SELECT: "Select",
  MULTISELECT: "Multi-Select",
  BOOLEAN: "Checkbox",
  URL: "URL",
  EMAIL: "Email",
  PHONE: "Phone",
  RELATIONSHIP: "Relationship",
  FILE: "File",
};

const fieldTypeColors: Record<string, string> = {
  TEXT: "bg-blue-500/10 text-blue-500",
  TEXTAREA: "bg-blue-500/10 text-blue-500",
  NUMBER: "bg-green-500/10 text-green-500",
  CURRENCY: "bg-emerald-500/10 text-emerald-500",
  PERCENT: "bg-lime-500/10 text-lime-500",
  DATE: "bg-purple-500/10 text-purple-500",
  SELECT: "bg-orange-500/10 text-orange-500",
  MULTISELECT: "bg-pink-500/10 text-pink-500",
  BOOLEAN: "bg-slate-500/10 text-slate-500",
  URL: "bg-cyan-500/10 text-cyan-500",
  EMAIL: "bg-indigo-500/10 text-indigo-500",
  PHONE: "bg-teal-500/10 text-teal-500",
  RELATIONSHIP: "bg-violet-500/10 text-violet-500",
  FILE: "bg-amber-500/10 text-amber-500",
};

// Mapping for display names
const moduleDisplayNames: Record<string, string> = {
  accounts: "Accounts",
  contacts: "Contacts",
  leads: "Leads",
  opportunities: "Opportunities",
};

export function CustomFieldsList({ 
  fields, 
  moduleType, 
  moduleIdentifier,
  moduleName 
}: CustomFieldsListProps) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEdit = (field: CustomField) => {
    if (field.isSystem) {
      toast.error("System fields cannot be edited");
      return;
    }
    setEditingField(field);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error("System fields cannot be deleted");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/custom-fields/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Custom field deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete custom field");
    }
  };

  const displayName = moduleName || moduleIdentifier;

  if (fields.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No custom fields defined for {displayName}</p>
        <p className="text-sm mt-1 text-muted-foreground">Click &quot;Add Field&quot; to create one</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Field Name</TableHead>
            <TableHead>Field Key</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id}>
              <TableCell>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {field.fieldName}
                  {field.isSystem && (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
                {field.fieldType === "RELATIONSHIP" && field.relatedModule && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    Links to {moduleDisplayNames[field.relatedModule] || field.relatedModule}
                  </div>
                )}
                {field.fieldType === "FILE" && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    File attachment
                  </div>
                )}
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {field.fieldKey}
                </code>
              </TableCell>
              <TableCell>
                <Badge className={fieldTypeColors[field.fieldType] || "bg-gray-500/10 text-gray-500"}>
                  {fieldTypeLabels[field.fieldType] || field.fieldType}
                </Badge>
              </TableCell>
              <TableCell>
                {field.required ? (
                  <Badge variant="outline" className="text-orange-500 border-orange-500">
                    Required
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Optional</span>
                )}
              </TableCell>
              <TableCell>
                {field.isActive ? (
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleEdit(field)}
                      disabled={field.isSystem}
                      className={field.isSystem ? "text-muted-foreground" : ""}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={field.isSystem ? "text-muted-foreground" : "text-red-600"}
                      onClick={() => handleDelete(field.id, field.fieldName, field.isSystem)}
                      disabled={field.isSystem}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditCustomFieldDialog
        field={editingField}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
