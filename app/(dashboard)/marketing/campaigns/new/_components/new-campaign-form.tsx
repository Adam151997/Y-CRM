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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SOCIAL", "EVENT", "WEBINAR", "SMS", "ADS"]),
  segmentId: z.string().optional(),
  subject: z.string().optional(),
  scheduledAt: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Segment {
  id: string;
  name: string;
  memberCount: number;
}

interface NewCampaignFormProps {
  segments: Segment[];
}

export function NewCampaignForm({ segments }: NewCampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "EMAIL",
    },
  });

  const selectedType = watch("type");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          segmentId: data.segmentId === "_none" ? undefined : data.segmentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create campaign");
      }

      const { campaign } = await response.json();
      router.push(`/marketing/campaigns/${campaign.id}`);
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
          <Label htmlFor="name">Campaign Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Spring Sale 2025"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Campaign Type *</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => setValue("type", value as FormData["type"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SOCIAL">Social Media</SelectItem>
              <SelectItem value="EVENT">Event</SelectItem>
              <SelectItem value="WEBINAR">Webinar</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="ADS">Ads</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type.message}</p>
          )}
        </div>

        {/* Subject (for email campaigns) */}
        {selectedType === "EMAIL" && (
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Don't miss our Spring Sale!"
              {...register("subject")}
            />
          </div>
        )}

        {/* Segment */}
        <div className="space-y-2">
          <Label htmlFor="segmentId">Target Segment</Label>
          <Select
            onValueChange={(value) => setValue("segmentId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select segment (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No segment (all contacts)</SelectItem>
              {segments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name} ({segment.memberCount} members)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scheduled At */}
        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Schedule For</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            {...register("scheduledAt")}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to save as draft
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the campaign goals..."
          rows={3}
          {...register("description")}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/marketing/campaigns")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Campaign
        </Button>
      </div>
    </form>
  );
}
