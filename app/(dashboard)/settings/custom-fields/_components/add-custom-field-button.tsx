"use client";

import { useState } from "react";
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
  DialogTrigger,
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
import { Plus, Loader2 } from "lucide-react";

const customFieldSchema = z.object({
  module: z.enum(["LEAD", "CONTACT", "ACCOUNT", "OPPORTUNITY"]),
  fieldName: z.string().min(1, "Field name is required").max(100),
  fieldKey: z
    .string()
    .min(1, "Field key is required")
    .max(50)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Must start with a letter and contain only lowercase letters, numbers, and underscores"
    ),
  fieldType: z.enum([
    "TEXT",
    "NUMBER",
    "DATE",
    "SELECT",
    "MULTISELECT",
    "BOOLEAN",
    "URL",
    "EMAIL",
    "PHONE",
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

const modules = [
  { value: "LEAD", label: "Leads" },
  { value: "CONTACT", label: "Contacts" },
  { value: "ACCOUNT", label: "Accounts" },
  { value: "OPPORTUNITY", label: "Opportunities" },
];

const fieldTypes = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "SELECT", label: "Single Select" },
  { value: "MULTISELECT", label: "Multi Select" },
  { value: "BOOLEAN", label: "Checkbox" },
  { value: "URL", label: "URL" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
];

export function AddCustomFieldButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      module: "LEAD",
      fieldName: "",
      fieldKey: "",
      fieldType: "TEXT",
      required: false,
      placeholder: "",
      helpText: "",
    },
  });

  // Auto-generate fieldKey from fieldName
  const handleFieldNameChange = (value: string) => {
    form.setValue("fieldName", value);
    const key = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/^[0-9]/, "f$&");
    form.setValue("fieldKey", key);
  };

  const onSubmit = async (data: CustomFieldFormValues) => {
    try {
      const response = await fetch("/api/settings/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create custom field");
      }

      toast.success("Custom field created");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom Field</DialogTitle>
          <DialogDescription>
            Create a new custom field for capturing additional data
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="module"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.value} value={module.value}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Industry Type"
                      {...field}
                      onChange={(e) => handleFieldNameChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>Display name shown to users</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fieldKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Key</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., industry_type" {...field} />
                  </FormControl>
                  <FormDescription>Internal key for the field (auto-generated)</FormDescription>
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

            <FormField
              control={form.control}
              name="placeholder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placeholder (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a placeholder..." {...field} />
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
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Field
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
