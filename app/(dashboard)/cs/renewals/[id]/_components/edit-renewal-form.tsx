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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const editSchema = z.object({
  probability: z.number().min(0).max(100),
  ownerUserId: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  nextActionDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface TeamMember {
  id: string;
  name: string;
}

interface EditRenewalFormProps {
  renewal: {
    id: string;
    probability: number;
    ownerUserId: string | null;
    nextAction: string | null;
    nextActionDate: string | null;
    notes: string | null;
  };
  teamMembers: TeamMember[];
}

export function EditRenewalForm({ renewal, teamMembers }: EditRenewalFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      probability: renewal.probability,
      ownerUserId: renewal.ownerUserId || "",
      nextAction: renewal.nextAction || "",
      nextActionDate: renewal.nextActionDate ? new Date(renewal.nextActionDate) : null,
      notes: renewal.notes || "",
    },
  });

  const probability = form.watch("probability");

  const onSubmit = async (data: EditFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        probability: data.probability,
      };

      if (data.ownerUserId !== undefined) {
        payload.ownerUserId = data.ownerUserId === "_none" ? null : data.ownerUserId || null;
      }
      if (data.nextAction !== undefined) {
        payload.nextAction = data.nextAction || null;
      }
      if (data.nextActionDate !== undefined) {
        payload.nextActionDate = data.nextActionDate?.toISOString() || null;
      }
      if (data.notes !== undefined) {
        payload.notes = data.notes || null;
      }

      const response = await fetch(`/api/cs/renewals/${renewal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update renewal");
      }

      toast.success("Renewal updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Probability */}
        <FormField
          control={form.control}
          name="probability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Probability: {probability}%</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Owner */}
        <FormField
          control={form.control}
          name="ownerUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <Select 
                value={field.value || "_none"} 
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Next Action */}
        <FormField
          control={form.control}
          name="nextAction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Action</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Schedule renewal call"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Next Action Date */}
        <FormField
          control={form.control}
          name="nextActionDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Next Action Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "MMM d, yyyy")
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add notes..."
                  rows={3}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
