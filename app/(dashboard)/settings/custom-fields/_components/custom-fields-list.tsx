"use client";

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
import { MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface CustomField {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options: unknown; // Prisma JsonValue
  displayOrder: number;
  isActive: boolean;
}

interface CustomFieldsListProps {
  fields: CustomField[];
  module: string;
}

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Select",
  MULTISELECT: "Multi-Select",
  BOOLEAN: "Checkbox",
  URL: "URL",
  EMAIL: "Email",
  PHONE: "Phone",
};

const fieldTypeColors: Record<string, string> = {
  TEXT: "bg-blue-500/10 text-blue-500",
  NUMBER: "bg-green-500/10 text-green-500",
  DATE: "bg-purple-500/10 text-purple-500",
  SELECT: "bg-orange-500/10 text-orange-500",
  MULTISELECT: "bg-pink-500/10 text-pink-500",
  BOOLEAN: "bg-slate-500/10 text-slate-500",
  URL: "bg-cyan-500/10 text-cyan-500",
  EMAIL: "bg-indigo-500/10 text-indigo-500",
  PHONE: "bg-teal-500/10 text-teal-500",
};

export function CustomFieldsList({ fields, module }: CustomFieldsListProps) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
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

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No custom fields defined for this module</p>
        <p className="text-sm mt-1">Click "Add Field" to create one</p>
      </div>
    );
  }

  return (
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
            <TableCell className="font-medium">{field.fieldName}</TableCell>
            <TableCell>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {field.fieldKey}
              </code>
            </TableCell>
            <TableCell>
              <Badge className={fieldTypeColors[field.fieldType]}>
                {fieldTypeLabels[field.fieldType]}
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
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDelete(field.id, field.fieldName)}
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
  );
}
