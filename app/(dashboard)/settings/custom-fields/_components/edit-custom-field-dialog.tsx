"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const editCustomFieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required").max(100),
  fieldType: z.enum([
    "TEXT",
    "TEXTAREA",
    "NUMBER",
    "CURRENCY",
    "PERCENT",
    "DATE",
    "SELECT",
    "MULTISELECT",
    "BOOLEAN",
    "URL",
    "EMAIL",
    "PHONE",
    "RELATIONSHIP",
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
  options: z.string().optional().nullable(),
});

type EditCustomFieldFormValues = z.infer<typeof editCustomFieldSchema>;

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

interface EditCustomFieldDialogProps {
  field: CustomField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fieldTypes = [
  { value: "TEXT", label: "Text" },
  { value: "TEXTAREA", label: "Text Area" },
  { value: "NUMBER", label: "Number" },
  { value: "CURRENCY", label: "Currency" },
  { value: "PERCENT", label: "Percent" },
  { value: "DATE", label: "Date" },
  { value: "SELECT", label: "Single Select" },
  { value: "MULTISELECT", label: "Multi Select" },
  { value: "BOOLEAN", label: "Checkbox" },
  { value: "URL", label: "URL" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "RELATIONSHIP", label: "Relationship" },
];

export function EditCustomFieldDialog({
  field,
  open,
  onOpenChange,
}: EditCustomFieldDialogProps) {
  const router = useRouter();

  const form = useForm<EditCustomFieldFormValues>({
    resolver: zodResolver(editCustomFieldSchema),
    defaultValues: {
      fieldName: "",
      fieldType: "TEXT",
      required: false,
      placeholder: "",
      helpText: "",
      options: "",
    },
  });

  // Reset form when field changes
  useEffect(() => {
    if (field) {
      const optionsString = Array.isArray(field.options)
        ? (field.options as string[]).join(", ")
        : "";

      form.reset({
        fieldName: field.fieldName,
        fieldType: field.fieldType as EditCustomFieldFormValues["fieldType"],
        required: field.required,
        placeholder: field.placeholder || "",
        helpText: field.helpText || "",
        options: optionsString,
      });
    }
  }, [field, form]);

  const fieldType = form.watch("fieldType");
  const showOptionsField = fieldType === "SELECT" || fieldType === "MULTISELECT";

  const onSubmit = async (data: EditCustomFieldFormValues) => {
    if (!field) return;

    try {
      const payload: Record<string, unknown> = {
        fieldName: data.fieldName,
        fieldType: data.fieldType,
        required: data.required,
        placeholder: data.placeholder || null,
        helpText: data.helpText || null,
      };

      // Add options for SELECT/MULTISELECT
      if (showOptionsField && data.options) {
        payload.options = data.options
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
      } else if (!showOptionsField) {
        payload.options = null;
      }

      const response = await fetch(`/api/settings/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update custom field");
      }

      toast.success("Custom field updated");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Custom Field</DialogTitle>
          <DialogDescription>
            Update the custom field configuration. Field key cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Field Key (Read-only) */}
            {field && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Field Key</label>
                <code className="block text-sm bg-muted px-3 py-2 rounded">
                  {field.fieldKey}
                </code>
              </div>
            )}

            <FormField
              control={form.control}
              name="fieldName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Industry Type" {...field} />
                  </FormControl>
                  <FormDescription>Display name shown to users</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Options for SELECT/MULTISELECT */}
            {showOptionsField && (
              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Option 1, Option 2, Option 3"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list of options
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="placeholder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placeholder (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a placeholder..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="helpText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Help Text (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Help text shown below the field..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Required Field</FormLabel>
                    <FormDescription>
                      Users must fill in this field
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
