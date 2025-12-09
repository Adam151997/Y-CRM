"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  createLead: z.boolean().default(true),
  leadSource: z.string().default("FORM"),
});

type FormData = z.infer<typeof formSchema>;

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder: string;
}

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

export function NewFormForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([
    { id: "field-1", type: "text", label: "Full Name", required: true, placeholder: "John Doe" },
    { id: "field-2", type: "email", label: "Email", required: true, placeholder: "john@example.com" },
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      createLead: true,
      leadSource: "FORM",
    },
  });

  const createLead = watch("createLead");

  const addField = () => {
    const newId = `field-${Date.now()}`;
    setFields([...fields, { id: newId, type: "text", label: "", required: false, placeholder: "" }]);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  const updateField = (index: number, key: keyof FormField, value: string | boolean) => {
    const newFields = [...fields];
    (newFields[index] as Record<string, unknown>)[key] = value;
    setFields(newFields);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    // Validate at least one field has a label
    const validFields = fields.filter(f => f.label.trim());
    if (validFields.length === 0) {
      setError("At least one field with a label is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/marketing/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          fields: validFields,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create form");
      }

      const { form } = await response.json();
      router.push(`/marketing/forms/${form.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Form Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Contact Us Form"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Lead Source */}
        <div className="space-y-2">
          <Label htmlFor="leadSource">Lead Source</Label>
          <Input
            id="leadSource"
            placeholder="e.g., Website Contact Form"
            {...register("leadSource")}
          />
          <p className="text-xs text-muted-foreground">
            Source value for created leads
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this form..."
          rows={2}
          {...register("description")}
        />
      </div>

      {/* Create Lead Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label htmlFor="createLead">Create Lead on Submission</Label>
          <p className="text-sm text-muted-foreground">
            Automatically create a new lead when this form is submitted
          </p>
        </div>
        <Switch
          id="createLead"
          checked={createLead}
          onCheckedChange={(checked) => setValue("createLead", checked)}
        />
      </div>

      {/* Form Fields Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Form Fields</Label>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <Select
                    value={field.type}
                    onValueChange={(value) => updateField(index, "type", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Field label"
                    value={field.label}
                    onChange={(e) => updateField(index, "label", e.target.value)}
                    className="flex-1"
                  />

                  <Input
                    placeholder="Placeholder"
                    value={field.placeholder}
                    onChange={(e) => updateField(index, "placeholder", e.target.value)}
                    className="w-40"
                  />

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(index, "required", checked)}
                    />
                    <span className="text-xs text-muted-foreground">Required</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/marketing/forms")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Form
        </Button>
      </div>
    </form>
  );
}
