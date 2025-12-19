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
import { RelationshipFieldInput } from "@/components/forms/relationship-field-input";
import { toast } from "sonner";
import { Loader2, Upload, File, X, ExternalLink } from "lucide-react";

interface Field {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options?: unknown;
  placeholder?: string | null;
  helpText?: string | null;
  defaultValue?: unknown;
  relatedModule?: string | null;
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
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleChange = (fieldKey: string, value: unknown) => {
    setFormData({ ...formData, [fieldKey]: value });
  };

  const handleFileUpload = async (fieldKey: string, file: File) => {
    setUploadingField(fieldKey);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const fileData = await response.json();
      handleChange(fieldKey, fileData);
      toast.success("File uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setUploadingField(null);
    }
  };

  const handleFileRemove = async (fieldKey: string) => {
    const currentFile = formData[fieldKey] as { url?: string } | null;
    if (currentFile?.url) {
      try {
        await fetch(`/api/files?url=${encodeURIComponent(currentFile.url)}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }
    handleChange(fieldKey, null);
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
            placeholder={field.placeholder || undefined}
            value={String(value || "")}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            required={field.required}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            placeholder={field.placeholder || undefined}
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
            placeholder={field.placeholder || undefined}
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

      case "RELATIONSHIP":
        return (
          <RelationshipFieldInput
            relatedModule={field.relatedModule || ""}
            value={value ? String(value) : null}
            onChange={(newValue) => handleChange(field.fieldKey, newValue)}
            placeholder={field.placeholder || `Select ${field.relatedModule}...`}
          />
        );

      case "FILE":
        const fileValue = value as { url?: string; name?: string; size?: number; type?: string } | null;
        const isUploading = uploadingField === field.fieldKey;
        
        if (fileValue?.url) {
          return (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileValue.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileValue.size ? `${(fileValue.size / 1024).toFixed(1)} KB` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={fileValue.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleFileRemove(field.fieldKey)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="relative">
            <Input
              type="file"
              className="hidden"
              id={`file-${field.fieldKey}`}
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(field.fieldKey, file);
                }
              }}
            />
            <label
              htmlFor={`file-${field.fieldKey}`}
              className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                isUploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {field.placeholder || "Click to upload a file"}
                  </span>
                </>
              )}
            </label>
          </div>
        );

      default:
        return (
          <Input
            placeholder={field.placeholder || undefined}
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
                  field.fieldType === "TEXTAREA" || field.fieldType === "RELATIONSHIP" || field.fieldType === "FILE"
                    ? "md:col-span-2"
                    : ""
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
