"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CustomFieldDefinition {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options: string[] | null;
  defaultValue: unknown;
  placeholder: string | null;
  helpText: string | null;
  displayOrder: number;
}

interface CustomFieldsFormProps {
  module: "LEAD" | "CONTACT" | "ACCOUNT" | "OPPORTUNITY";
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function CustomFieldsForm({
  module,
  values,
  onChange,
  disabled = false,
}: CustomFieldsFormProps) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`/api/settings/custom-fields?module=${module}`);
        if (response.ok) {
          const data = await response.json();
          // API returns array directly
          setFields(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch custom fields:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFields();
  }, [module]);

  const handleChange = (fieldKey: string, value: unknown) => {
    onChange({ ...values, [fieldKey]: value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={values[field.fieldKey]}
          onChange={(val) => handleChange(field.fieldKey, val)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface CustomFieldInputProps {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function CustomFieldInput({ field, value, onChange, disabled }: CustomFieldInputProps) {
  const renderField = () => {
    switch (field.fieldType) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
      case "URL":
        return (
          <Input
            type={field.fieldType === "EMAIL" ? "email" : field.fieldType === "URL" ? "url" : "text"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            rows={3}
          />
        );

      case "NUMBER":
      case "CURRENCY":
      case "PERCENT":
        return (
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            step={field.fieldType === "PERCENT" ? "0.01" : "any"}
          />
        );

      case "DATE":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value as string), "PPP") : field.placeholder || "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value as string) : undefined}
                onSelect={(date) => onChange(date?.toISOString() || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "BOOLEAN":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.fieldKey}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => onChange(checked)}
              disabled={disabled}
            />
            <label
              htmlFor={field.fieldKey}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.placeholder || "Yes"}
            </label>
          </div>
        );

      case "SELECT":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={(val) => onChange(val || null)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "MULTISELECT":
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 min-h-[2.5rem] p-2 border rounded-md">
              {selectedValues.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  {field.placeholder || "Select options..."}
                </span>
              ) : (
                selectedValues.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      if (!disabled) {
                        onChange(selectedValues.filter((sv) => sv !== v));
                      }
                    }}
                  >
                    {v} ×
                  </Badge>
                ))
              )}
            </div>
            <Select
              value=""
              onValueChange={(val) => {
                if (val && !selectedValues.includes(val)) {
                  onChange([...selectedValues, val]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add option..." />
              </SelectTrigger>
              <SelectContent>
                {field.options
                  ?.filter((opt) => !selectedValues.includes(opt))
                  .map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.fieldKey}>
        {field.fieldName}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
}

interface CustomFieldsDisplayProps {
  module: "LEAD" | "CONTACT" | "ACCOUNT" | "OPPORTUNITY";
  values: Record<string, unknown>;
  className?: string;
}

export function CustomFieldsDisplay({
  module,
  values,
  className,
}: CustomFieldsDisplayProps) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`/api/settings/custom-fields?module=${module}`);
        if (response.ok) {
          const data = await response.json();
          // API returns array directly
          setFields(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch custom fields:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFields();
  }, [module]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (fields.length === 0 || Object.keys(values || {}).length === 0) {
    return null;
  }

  const formatValue = (field: CustomFieldDefinition, value: unknown): string => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    switch (field.fieldType) {
      case "BOOLEAN":
        return value ? "Yes" : "No";
      case "DATE":
        try {
          return format(new Date(value as string), "PPP");
        } catch {
          return String(value);
        }
      case "CURRENCY":
        return `$${Number(value).toLocaleString()}`;
      case "PERCENT":
        return `${value}%`;
      case "MULTISELECT":
        return Array.isArray(value) ? value.join(", ") : String(value);
      default:
        return String(value);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {fields.map((field) => {
        const value = values[field.fieldKey];
        if (value === null || value === undefined || value === "") return null;

        return (
          <div key={field.id} className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{field.fieldName}</span>
            <span className="text-sm font-medium text-right max-w-[60%]">
              {formatValue(field, value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
