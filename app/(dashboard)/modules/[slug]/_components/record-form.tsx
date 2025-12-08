"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Field {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options?: unknown;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
}

interface Module {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  fields: Field[];
}

interface RecordFormProps {
  module: Module;
  record?: {
    id: string;
    data: unknown;
  };
}

export function RecordForm({ module, record }: RecordFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Initialize form data from record or defaults
  const initialData: Record<string, unknown> = {};
  module.fields.forEach((field) => {
    if (record) {
      const recordData = record.data as Record<string, unknown>;
      initialData[field.fieldKey] = recordData[field.fieldKey] ?? field.defaultValue ?? "";
    } else {
      initialData[field.fieldKey] = field.defaultValue ?? "";
    }
  });

  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);

  const handleChange = (fieldKey: string, value: unknown) => {
    setFormData({ ...formData, [fieldKey]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = record
        ? `/api/modules/${module.slug}/records/${record.id}`
        : `/api/modules/${module.slug}/records`;

      const method = record ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(record ? `${module.name} updated` : `${module.name} created`);
        router.push(`/modules/${module.slug}/${result.record.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save");
        if (error.details) {
          error.details.forEach((d: string) => toast.error(d));
        }
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.fieldKey];

    switch (field.fieldType) {
      case "TEXT":
      case "EMAIL":
      case "URL":
      case "PHONE":
        return (
          <Input
            type={
              field.fieldType === "EMAIL"
                ? "email"
                : field.fieldType === "URL"
                ? "url"
                : field.fieldType === "PHONE"
                ? "tel"
                : "text"
            }
            placeholder={field.placeholder}
            value={String(value || "")}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            required={field.required}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={String(value || "")}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            required={field.required}
            rows={4}
          />
        );

      case "NUMBER":
      case "CURRENCY":
      case "PERCENT":
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value !== undefined && value !== "" ? String(value) : ""}
            onChange={(e) =>
              handleChange(
                field.fieldKey,
                e.target.value ? Number(e.target.value) : ""
              )
            }
            required={field.required}
            step={field.fieldType === "CURRENCY" ? "0.01" : "1"}
          />
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={
              value
                ? new Date(String(value)).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            required={field.required}
          />
        );

      case "BOOLEAN":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleChange(field.fieldKey, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? "Yes" : "No"}
            </span>
          </div>
        );

      case "SELECT":
        const options = (field.options as string[]) || [];
        return (
          <Select
            value={String(value || "")}
            onValueChange={(v) => handleChange(field.fieldKey, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "MULTISELECT":
        const multiOptions = (field.options as string[]) || [];
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {multiOptions.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    handleChange(field.fieldKey, newValue);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <Input
            placeholder={field.placeholder}
            value={String(value || "")}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{record ? "Edit" : "Create"} {module.name}</CardTitle>
        <CardDescription>
          {record
            ? `Update the ${module.name.toLowerCase()} details`
            : `Fill in the details to create a new ${module.name.toLowerCase()}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {module.fields.map((field) => (
              <div
                key={field.id}
                className={
                  field.fieldType === "TEXTAREA" ? "md:col-span-2" : ""
                }
              >
                <Label htmlFor={field.fieldKey}>
                  {field.fieldName}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="mt-1.5">{renderField(field)}</div>
                {field.helpText && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {record ? "Save Changes" : `Create ${module.name}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
