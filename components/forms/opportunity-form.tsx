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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AssigneeSelector } from "./assignee-selector";
import { CustomFieldsForm } from "./custom-fields-renderer";
import { CURRENCIES } from "@/lib/constants/currencies";

const opportunityFormSchema = z.object({
  name: z.string().min(1, "Opportunity name is required").max(200),
  value: z.coerce.number().positive("Value must be positive"),
  currency: z.string().length(3).default("USD"),
  probability: z.coerce.number().int().min(0).max(100).default(50),
  accountId: z.string().uuid("Please select an account"),
  stageId: z.string().uuid("Please select a stage"),
  expectedCloseDate: z.date().optional().nullable(),
  assignedToId: z.string().nullable().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

interface Account {
  id: string;
  name: string;
}

interface PipelineStage {
  id: string;
  name: string;
  probability: number | null;
  color: string | null;
}

interface OpportunityFormProps {
  accounts: Account[];
  stages: PipelineStage[];
  initialData?: {
    id: string;
    name: string;
    value: number;
    currency: string;
    probability: number;
    accountId: string;
    stageId: string;
    expectedCloseDate?: Date | null;
    assignedToId?: string | null;
  };
  initialCustomFields?: Record<string, unknown>;
}

const NO_SELECTION = "_none";

export function OpportunityForm({ accounts, stages, initialData, initialCustomFields }: OpportunityFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [customFields, setCustomFields] = useState<Record<string, unknown>>(
    initialCustomFields || {}
  );

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      value: initialData?.value || 0,
      currency: initialData?.currency || "USD",
      probability: initialData?.probability || 50,
      accountId: initialData?.accountId || "",
      stageId: initialData?.stageId || "",
      expectedCloseDate: initialData?.expectedCloseDate
        ? new Date(initialData.expectedCloseDate)
        : null,
      assignedToId: initialData?.assignedToId || null,
    },
  });

  // Update probability when stage changes
  const handleStageChange = (stageId: string) => {
    form.setValue("stageId", stageId);
    const stage = stages.find((s) => s.id === stageId);
    if (stage?.probability !== null && stage?.probability !== undefined) {
      form.setValue("probability", stage.probability);
    }
  };

  const onSubmit = async (data: OpportunityFormValues) => {
    try {
      const payload = {
        name: data.name,
        value: data.value,
        currency: data.currency,
        probability: data.probability,
        accountId: data.accountId,
        stageId: data.stageId,
        expectedCloseDate: data.expectedCloseDate || null,
        assignedToId: data.assignedToId || null,
        customFields,
      };

      const url = isEditing
        ? `/api/opportunities/${initialData.id}`
        : "/api/opportunities";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save opportunity");
      }

      const opportunity = await response.json();
      toast.success(isEditing ? "Opportunity updated" : "Opportunity created");
      router.push(`/opportunities/${opportunity.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const watchedValue = form.watch("value") || 0;
  const watchedProbability = form.watch("probability") || 0;
  const weightedValue = (watchedValue * watchedProbability) / 100;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enterprise License Deal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account *</FormLabel>
                    <Select
                      value={field.value || NO_SELECTION}
                      onValueChange={(value) =>
                        field.onChange(value === NO_SELECTION ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_SELECTION}>Select account</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
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
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Stage *</FormLabel>
                    <Select
                      value={field.value || NO_SELECTION}
                      onValueChange={(value) =>
                        handleStageChange(value === NO_SELECTION ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_SELECTION}>Select stage</SelectItem>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.color || "#6B7280" }}
                              />
                              {stage.name}
                              {stage.probability !== null && (
                                <span className="text-muted-foreground text-xs">
                                  ({stage.probability}%)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Value & Probability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Value & Probability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Value *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Win Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Weighted Value:</span>
                  <span className="text-lg font-semibold">
                    ${weightedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline & Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="expectedCloseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Close Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When do you expect this deal to close?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <AssigneeSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFieldsForm
                module="OPPORTUNITY"
                values={customFields}
                onChange={setCustomFields}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? "Update Opportunity" : "Create Opportunity"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
