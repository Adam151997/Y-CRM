"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Users, UserPlus, Eye } from "lucide-react";

const ruleSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.string().min(1, "Operator is required"),
  value: z.string(),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  targetEntity: z.enum(["CONTACT", "LEAD"]),
  type: z.enum(["DYNAMIC", "STATIC"]),
  ruleLogic: z.enum(["AND", "OR"]),
  rules: z.array(ruleSchema),
});

type FormData = z.infer<typeof formSchema>;

interface Rule {
  field: string;
  operator: string;
  value: string;
}

interface FieldOption {
  value: string;
  label: string;
}

const operatorOptions = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

export function NewSegmentForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([{ field: "", operator: "equals", value: "" }]);
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [preview, setPreview] = useState<{ count: number; preview: Array<{ id: string; name: string; email: string | null }> } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetEntity: "CONTACT",
      type: "DYNAMIC",
      ruleLogic: "AND",
      rules: [],
    },
  });

  const selectedType = watch("type");
  const targetEntity = watch("targetEntity");
  const ruleLogic = watch("ruleLogic");

  // Fetch field options when target entity changes
  useEffect(() => {
    async function fetchFields() {
      try {
        const response = await fetch(`/api/marketing/segments/fields?targetEntity=${targetEntity}`);
        if (response.ok) {
          const data = await response.json();
          setFieldOptions(data.fields);
          // Reset rules when entity changes
          setRules([{ field: "", operator: "equals", value: "" }]);
          setPreview(null);
        }
      } catch (err) {
        console.error("Error fetching fields:", err);
      }
    }
    fetchFields();
  }, [targetEntity]);

  const addRule = () => {
    setRules([...rules, { field: "", operator: "equals", value: "" }]);
  };

  const removeRule = (index: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, i) => i !== index));
    }
  };

  const updateRule = (index: number, field: keyof Rule, value: string) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  // Preview members
  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const validRules = rules.filter(r => r.field && r.operator);
      const response = await fetch("/api/marketing/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEntity,
          rules: validRules,
          ruleLogic,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (err) {
      console.error("Error previewing:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    // Filter out incomplete rules
    const validRules = rules.filter(r => r.field && r.operator);

    try {
      const response = await fetch("/api/marketing/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          rules: validRules,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create segment");
      }

      const { segment } = await response.json();
      router.push(`/marketing/segments/${segment.id}`);
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
          <Label htmlFor="name">Segment Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Enterprise Customers"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Target Entity */}
        <div className="space-y-2">
          <Label htmlFor="targetEntity">Target Entity *</Label>
          <Select
            value={targetEntity}
            onValueChange={(value) => setValue("targetEntity", value as "CONTACT" | "LEAD")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONTACT">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                </div>
              </SelectItem>
              <SelectItem value="LEAD">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Leads
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose whether this segment targets Contacts or Leads
          </p>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Segment Type *</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => setValue("type", value as "DYNAMIC" | "STATIC")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DYNAMIC">Dynamic (rule-based)</SelectItem>
              <SelectItem value="STATIC">Static (manual selection)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this segment..."
          rows={2}
          {...register("description")}
        />
      </div>

      {/* Rules (for Dynamic segments) */}
      {selectedType === "DYNAMIC" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Segment Rules</Label>
            <div className="flex items-center gap-2">
              <Select
                value={ruleLogic}
                onValueChange={(value) => setValue("ruleLogic", value as "AND" | "OR")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">Match ALL</SelectItem>
                  <SelectItem value="OR">Match ANY</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Preview
              </Button>
            </div>
          </div>

          {/* Preview Results */}
          {preview && (
            <Card className="bg-muted/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="secondary">{preview.count} {targetEntity === "CONTACT" ? "contacts" : "leads"}</Badge>
                  would match this segment
                </CardTitle>
              </CardHeader>
              {preview.preview.length > 0 && (
                <CardContent className="py-2">
                  <div className="text-sm space-y-1">
                    {preview.preview.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-muted-foreground">
                        <span>{item.name}</span>
                        {item.email && <span className="text-xs">({item.email})</span>}
                      </div>
                    ))}
                    {preview.count > preview.preview.length && (
                      <div className="text-xs text-muted-foreground">
                        +{preview.count - preview.preview.length} more...
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <div className="space-y-3">
            {rules.map((rule, index) => (
              <Card key={index}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Select
                      value={rule.field}
                      onValueChange={(value) => updateRule(index, "field", value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={rule.operator}
                      onValueChange={(value) => updateRule(index, "operator", value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                      <Input
                        placeholder="Value"
                        value={rule.value}
                        onChange={(e) => updateRule(index, "value", e.target.value)}
                        className="flex-1"
                      />
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(index)}
                      disabled={rules.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addRule}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/marketing/segments")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Segment
        </Button>
      </div>
    </form>
  );
}
