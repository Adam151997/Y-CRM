"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";

const stepSchema = z.object({
  order: z.number(),
  dayOffset: z.number().min(0),
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional(),
  taskType: z.string(),
  assigneeType: z.string(),
});

const playbookSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  trigger: z.enum(["MANUAL", "NEW_CUSTOMER", "RENEWAL_APPROACHING", "HEALTH_DROP", "TICKET_ESCALATION"]),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

type PlaybookFormValues = z.infer<typeof playbookSchema>;
type StepFormValues = z.infer<typeof stepSchema>;

const triggerOptions = [
  { value: "MANUAL", label: "Manual Start", description: "Start manually for any account" },
  { value: "NEW_CUSTOMER", label: "New Customer", description: "Auto-start when account becomes a customer" },
  { value: "RENEWAL_APPROACHING", label: "Renewal Approaching", description: "Auto-start before renewal date" },
  { value: "HEALTH_DROP", label: "Health Score Drop", description: "Auto-start when health score drops" },
  { value: "TICKET_ESCALATION", label: "Ticket Escalation", description: "Auto-start on ticket escalation" },
];

const taskTypes = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "ONBOARDING", label: "Onboarding Task" },
  { value: "RENEWAL", label: "Renewal Task" },
  { value: "OTHER", label: "Other" },
];

const assigneeTypes = [
  { value: "CSM", label: "Assigned CSM" },
  { value: "ACCOUNT_OWNER", label: "Account Owner" },
  { value: "CREATOR", label: "Playbook Creator" },
];

export function NewPlaybookForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlaybookFormValues>({
    resolver: zodResolver(playbookSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger: "MANUAL",
      steps: [
        {
          order: 1,
          dayOffset: 0,
          title: "",
          description: "",
          taskType: "CALL",
          assigneeType: "CSM",
        },
      ],
    },
  });

  const steps = form.watch("steps");

  const addStep = () => {
    const currentSteps = form.getValues("steps");
    const lastStep = currentSteps[currentSteps.length - 1];
    form.setValue("steps", [
      ...currentSteps,
      {
        order: currentSteps.length + 1,
        dayOffset: (lastStep?.dayOffset || 0) + 7,
        title: "",
        description: "",
        taskType: "CALL",
        assigneeType: "CSM",
      },
    ]);
  };

  const removeStep = (index: number) => {
    const currentSteps = form.getValues("steps");
    if (currentSteps.length > 1) {
      const newSteps = currentSteps.filter((_, i) => i !== index);
      // Reorder steps
      newSteps.forEach((step, i) => {
        step.order = i + 1;
      });
      form.setValue("steps", newSteps);
    }
  };

  const onSubmit = async (data: PlaybookFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cs/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create playbook");
      }

      const { playbook } = await response.json();
      toast.success("Playbook created successfully");
      router.push(`/cs/playbooks/${playbook.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Playbook Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., SaaS Onboarding" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="trigger"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trigger</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {triggerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <p>{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe when and how this playbook should be used..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Playbook Steps</h3>
              <p className="text-sm text-muted-foreground">
                Define the tasks that will be created when this playbook runs
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="font-mono text-sm">#{index + 1}</span>
                    </div>

                    <div className="flex-1 grid gap-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name={`steps.${index}.dayOffset`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Day Offset</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>Days from playbook start</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`steps.${index}.taskType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Task Type</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {taskTypes.map((type) => (
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
                          name={`steps.${index}.assigneeType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign To</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {assigneeTypes.map((type) => (
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
                      </div>

                      <FormField
                        control={form.control}
                        name={`steps.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Kickoff Call with Customer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`steps.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Instructions for this task..."
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Playbook
          </Button>
        </div>
      </form>
    </Form>
  );
}
