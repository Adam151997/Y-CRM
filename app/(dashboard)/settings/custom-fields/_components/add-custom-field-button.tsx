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
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, Box } from "lucide-react";

const customFieldSchema = z.object({
  moduleType: z.enum(["builtin", "custom"]),
  module: z.string().optional(),
  customModuleId: z.string().optional(),
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
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  options: z.string().optional(), // Comma-separated for SELECT/MULTISELECT
}).refine((data) => {
  if (data.moduleType === "builtin") {
    return !!data.module;
  }
  return !!data.customModuleId;
}, {
  message: "Please select a module",
  path: ["module"],
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

interface CustomModule {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  icon: string;
}

interface AddCustomFieldButtonProps {
  customModules?: CustomModule[];
}

const builtInModules = [
  { value: "LEAD", label: "Leads" },
  { value: "CONTACT", label: "Contacts" },
  { value: "ACCOUNT", label: "Accounts" },
  { value: "OPPORTUNITY", label: "Opportunities" },
];

const fieldTypes = [
  { value: "TEXT", label: "Text", description: "Single line text" },
  { value: "TEXTAREA", label: "Text Area", description: "Multi-line text" },
  { value: "NUMBER", label: "Number", description: "Numeric value" },
  { value: "CURRENCY", label: "Currency", description: "Money amount" },
  { value: "PERCENT", label: "Percent", description: "Percentage value" },
  { value: "DATE", label: "Date", description: "Date picker" },
  { value: "SELECT", label: "Single Select", description: "Choose one option" },
  { value: "MULTISELECT", label: "Multi Select", description: "Choose multiple" },
  { value: "BOOLEAN", label: "Checkbox", description: "Yes/No toggle" },
  { value: "URL", label: "URL", description: "Web link" },
  { value: "EMAIL", label: "Email", description: "Email address" },
  { value: "PHONE", label: "Phone", description: "Phone number" },
];

export function AddCustomFieldButton({ customModules = [] }: AddCustomFieldButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      moduleType: "builtin",
      module: "LEAD",
      customModuleId: "",
      fieldName: "",
      fieldKey: "",
      fieldType: "TEXT",
      required: false,
      placeholder: "",
      helpText: "",
      options: "",
    },
  });

  const moduleType = form.watch("moduleType");
  const fieldType = form.watch("fieldType");
  const showOptionsField = fieldType === "SELECT" || fieldType === "MULTISELECT";

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
      // Prepare payload
      const payload: Record<string, unknown> = {
        fieldName: data.fieldName,
        fieldKey: data.fieldKey,
        fieldType: data.fieldType,
        required: data.required,
        placeholder: data.placeholder || null,
        helpText: data.helpText || null,
      };

      // Add module reference
      if (data.moduleType === "builtin") {
        payload.module = data.module;
      } else {
        payload.customModuleId = data.customModuleId;
      }

      // Add options for SELECT/MULTISELECT
      if (showOptionsField && data.options) {
        payload.options = data.options.split(",").map((o) => o.trim()).filter(Boolean);
      }

      const response = await fetch("/api/settings/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Field</DialogTitle>
          <DialogDescription>
            Create a new custom field for capturing additional data
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Module Type Selection */}
            <FormField
              control={form.control}
              name="moduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="builtin">Built-in Module</SelectItem>
                      {customModules.length > 0 && (
                        <SelectItem value="custom">Custom Module</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Built-in Module Selection */}
            {moduleType === "builtin" && (
              <FormField
                control={form.control}
                name="module"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {builtInModules.map((module) => (
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
            )}

            {/* Custom Module Selection */}
            {moduleType === "custom" && (
              <FormField
                control={form.control}
                name="customModuleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Module</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a custom module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customModules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            <div className="flex items-center">
                              <Box className="h-4 w-4 mr-2 text-muted-foreground" />
                              {module.pluralName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

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
                          <div>
                            <span>{type.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({type.description})
                            </span>
                          </div>
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
                    <Input placeholder="Enter a placeholder..." {...field} />
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
                    <Input placeholder="Help text shown below the field..." {...field} />
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
