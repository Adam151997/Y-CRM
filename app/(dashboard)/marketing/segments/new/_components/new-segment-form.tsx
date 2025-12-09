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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";

const ruleSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.string().min(1, "Operator is required"),
  value: z.string(),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
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

const fieldOptions = [
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "industry", label: "Industry" },
  { value: "source", label: "Lead Source" },
  { value: "status", label: "Status" },
  { value: "title", label: "Job Title" },
  { value: "country", label: "Country" },
  { value: "createdAt", label: "Created Date" },
];

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "DYNAMIC",
      ruleLogic: "AND",
      rules: [],
    },
  });

  const selectedType = watch("type");
  const ruleLogic = watch("ruleLogic");

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
          </div>

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
