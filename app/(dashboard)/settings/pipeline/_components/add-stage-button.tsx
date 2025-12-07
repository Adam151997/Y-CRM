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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";

const pipelineStageSchema = z.object({
  name: z.string().min(1, "Stage name is required").max(100),
  module: z.enum(["LEAD", "OPPORTUNITY"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

type PipelineStageFormValues = z.infer<typeof pipelineStageSchema>;

const defaultColors = [
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
];

export function AddStageButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<PipelineStageFormValues>({
    resolver: zodResolver(pipelineStageSchema),
    defaultValues: {
      name: "",
      module: "OPPORTUNITY",
      color: defaultColors[0],
      probability: null,
      isWon: false,
      isLost: false,
    },
  });

  const watchIsWon = form.watch("isWon");
  const watchIsLost = form.watch("isLost");

  const onSubmit = async (data: PipelineStageFormValues) => {
    try {
      // Set probability based on won/lost
      if (data.isWon) {
        data.probability = 100;
      } else if (data.isLost) {
        data.probability = 0;
      }

      const response = await fetch("/api/settings/pipeline-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create stage");
      }

      toast.success("Pipeline stage created");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Pipeline Stage</DialogTitle>
          <DialogDescription>
            Create a new stage for your pipeline
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="module"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LEAD">Lead Pipeline</SelectItem>
                      <SelectItem value="OPPORTUNITY">Opportunity Pipeline</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Qualification" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === color
                            ? "border-foreground scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="#6366F1"
                      className="mt-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!watchIsWon && !watchIsLost && (
              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="50"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Opportunities in this stage will have this default probability
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="isWon"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Won Stage</FormLabel>
                      <FormDescription>
                        Deals moved here are marked as won
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            form.setValue("isLost", false);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isLost"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Lost Stage</FormLabel>
                      <FormDescription>
                        Deals moved here are marked as lost
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            form.setValue("isWon", false);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Stage
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
