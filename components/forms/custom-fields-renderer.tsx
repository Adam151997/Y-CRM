"use client";

import { useEffect, useState, useCallback } from "react";
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
import { CalendarIcon, Link2, X, Search } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RelationshipDisplay } from "@/components/forms/relationship-field-input";

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
  relatedModule?: string | null;
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

      case "RELATIONSHIP":
        return (
          <RelationshipSelector
            value={(value as string) || null}
            onChange={onChange}
            relatedModule={field.relatedModule || ""}
            placeholder={field.placeholder || `Select ${field.relatedModule}...`}
            disabled={disabled}
          />
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

// =============================================================================
// RELATIONSHIP SELECTOR COMPONENT
// Fixes Issue #3: Adds proper record picker for relationship fields
// =============================================================================

interface RelationshipSelectorProps {
  value: string | null;
  onChange: (value: unknown) => void;
  relatedModule: string;
  placeholder?: string;
  disabled?: boolean;
}

interface RecordOption {
  id: string;
  label: string;
}

function RelationshipSelector({
  value,
  onChange,
  relatedModule,
  placeholder = "Select record...",
  disabled = false,
}: RelationshipSelectorProps) {
  const [options, setOptions] = useState<RecordOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Fetch options from the related module
  const fetchOptions = useCallback(async (query: string = "") => {
    if (!relatedModule) return;
    
    setIsLoading(true);
    try {
      // Determine if it's a built-in or custom module
      const builtInModules = ["accounts", "contacts", "leads", "opportunities"];
      const isBuiltIn = builtInModules.includes(relatedModule.toLowerCase());

      let url: string;
      if (isBuiltIn) {
        url = `/api/${relatedModule.toLowerCase()}?limit=50${query ? `&search=${encodeURIComponent(query)}` : ""}`;
      } else {
        url = `/api/modules/${relatedModule}/records?limit=50${query ? `&search=${encodeURIComponent(query)}` : ""}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        // Extract records based on response structure
        let records: RecordOption[] = [];
        
        if (isBuiltIn) {
          // Built-in modules return array directly or with a key
          const items = data.items || data.records || data || [];
          records = items.map((item: any) => ({
            id: item.id,
            label: getRecordLabel(item, relatedModule),
          }));
        } else {
          // Custom modules return { records: [...] }
          const items = data.records || [];
          records = items.map((item: any) => ({
            id: item.id,
            label: getRecordLabel(item, relatedModule),
          }));
        }
        
        setOptions(records);
      }
    } catch (error) {
      console.error("Failed to fetch relationship options:", error);
    } finally {
      setIsLoading(false);
    }
  }, [relatedModule]);

  // Fetch selected record label on mount
  useEffect(() => {
    if (value && !selectedLabel) {
      fetchRecordLabel(value);
    }
  }, [value]);

  // Fetch options when opening
  useEffect(() => {
    if (isOpen) {
      fetchOptions(searchQuery);
    }
  }, [isOpen, searchQuery, fetchOptions]);

  const fetchRecordLabel = async (recordId: string) => {
    if (!relatedModule || !recordId) return;

    try {
      const builtInModules = ["accounts", "contacts", "leads", "opportunities"];
      const isBuiltIn = builtInModules.includes(relatedModule.toLowerCase());

      let url: string;
      if (isBuiltIn) {
        url = `/api/${relatedModule.toLowerCase()}/${recordId}`;
      } else {
        url = `/api/modules/${relatedModule}/records/${recordId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const record = data.record || data;
        setSelectedLabel(getRecordLabel(record, relatedModule));
      }
    } catch (error) {
      console.error("Failed to fetch record label:", error);
    }
  };

  const getRecordLabel = (record: any, module: string): string => {
    // For built-in modules
    if (record.name) return record.name;
    if (record.firstName && record.lastName) return `${record.firstName} ${record.lastName}`;
    
    // For custom modules, try common label fields
    const data = record.data || record;
    return data.name || data.title || data.label || record.id?.substring(0, 8) || "Unknown";
  };

  const handleSelect = (recordId: string, label: string) => {
    onChange(recordId);
    setSelectedLabel(label);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setSelectedLabel(null);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Link2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{selectedLabel || placeholder}</span>
          </div>
          {value && !disabled && (
            <X
              className="h-4 w-4 flex-shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={`Search ${relatedModule}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : options.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No records found
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.id}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                  value === option.id && "bg-accent"
                )}
                onClick={() => handleSelect(option.id, option.label)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// DISPLAY COMPONENTS
// =============================================================================

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

  return (
    <div className={cn("space-y-3", className)}>
      {fields.map((field) => {
        const value = values[field.fieldKey];
        if (value === null || value === undefined || value === "") return null;

        return (
          <div key={field.id} className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{field.fieldName}</span>
            <span className="text-sm font-medium text-right max-w-[60%]">
              {field.fieldType === "RELATIONSHIP" ? (
                <RelationshipDisplay
                  relatedModule={field.relatedModule || ""}
                  value={value as string}
                  showLink={true}
                />
              ) : (
                formatValue(field, value)
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(field: CustomFieldDefinition, value: unknown): string {
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
}


