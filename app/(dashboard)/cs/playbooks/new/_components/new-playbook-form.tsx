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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, GripVertical, Info } from "lucide-react";

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
  triggerConfig: z.object({
    daysBeforeRenewal: z.number().min(1).max(365).optional(),
    healthScoreThreshold: z.number().min(0).max(100).optional(),
  }).optional(),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
  isTemplate: z.boolean().default(false),
});

type PlaybookFormValues = z.infer<typeof playbookSchema>;

const triggerOptions = [
  { value: "MANUAL", label: "Manual Start", description: "Start manually for any account", hasConfig: false },
  { value: "NEW_CUSTOMER", label: "New Customer", description: "Auto-start when account type becomes CUSTOMER", hasConfig: false },
  { value: "RENEWAL_APPROACHING", label: "Renewal Approaching", description: "Auto-start X days before renewal end date", hasConfig: true, configField: "daysBeforeRenewal" },
  { value: "HEALTH_DROP", label: "Health Score Drop", description: "Auto-start when health score drops below threshold", hasConfig: true, configField: "healthScoreThreshold" },
  { value: "TICKET_ESCALATION", label: "Ticket Escalation", description: "Auto-start when ticket priority becomes URGENT", hasConfig: false },
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
      triggerConfig: {
        daysBeforeRenewal: 90,
        healthScoreThreshold: 40,
      },
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
      isTemplate: false,
    },
  });

  const steps = form.watch("steps");
  const selectedTrigger = form.watch("trigger");
  const triggerOption = triggerOptions.find(t => t.value === selectedTrigger);

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
      newSteps.forEach((step, i) => {
        step.order = i + 1;
      });
      form.setValue("steps", newSteps);
    }
  };

  const onSubmit = async (data: PlaybookFormValues) => {
    setIsSubmitting(true);
    try {
      // Only include relevant trigger config
      let triggerConfig = {};
      if (data.trigger === "RENEWAL_APPROACHING") {
        triggerConfig = { daysBeforeRenewal: data.triggerConfig?.daysBeforeRenewal || 90 };
      } else if (data.trigger === "HEALTH_DROP") {
        triggerConfig = { healthScoreThreshold: data.triggerConfig?.healthScoreThreshold || 40 };
      }

      const response = await fetch("/api/cs/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          triggerConfig,
        }),
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
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{triggerOption?.description}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Trigger Configuration */}
        {selectedTrigger === "RENEWAL_APPROACHING" && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">Trigger Configuration</p>
                  <FormField
                    control={form.control}
                    name="triggerConfig.daysBeforeRenewal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days Before Renewal</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 90)}
                          />
                        </FormControl>
                        <FormDescription>
                          Playbook will start this many days before the renewal end date
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTrigger === "HEALTH_DROP" && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">Trigger Configuration</p>
                  <FormField
                    control={form.control}
                    name="triggerConfig.healthScoreThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Health Score Threshold</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 40)}
                          />
                        </FormControl>
                        <FormDescription>
                          Playbook will start when health score drops below this value
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        <FormField
          control={form.control}
          name="isTemplate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Template Playbook</FormLabel>
                <FormDescription>
                  Mark this as a template that can be cloned by other users
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
