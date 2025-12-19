"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star, ThumbsUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketCSATProps {
  ticketId: string;
  ticketNumber: number;
  existingScore: number | null;
  existingFeedback: string | null;
  status: string;
}

export function TicketCSAT({ 
  ticketId, 
  ticketNumber, 
  existingScore, 
  existingFeedback,
  status 
}: TicketCSATProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(existingScore);
  const [feedback, setFeedback] = useState(existingFeedback || "");
  const [isEditing, setIsEditing] = useState(!existingScore);

  // Only show for resolved/closed tickets
  if (!["RESOLVED", "CLOSED"].includes(status)) {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedScore) {
      toast.error("Please select a satisfaction rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/cs/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          satisfactionScore: selectedScore,
          satisfactionFeedback: feedback.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save feedback");
      }

      toast.success("Thank you for your feedback!");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to save feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scoreLabels: Record<number, string> = {
    1: "Very Dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very Satisfied",
  };

  const scoreColors: Record<number, string> = {
    1: "text-red-500 hover:text-red-600",
    2: "text-orange-500 hover:text-orange-600",
    3: "text-yellow-500 hover:text-yellow-600",
    4: "text-lime-500 hover:text-lime-600",
    5: "text-green-500 hover:text-green-600",
  };

  // Display mode - show existing rating
  if (existingScore && !isEditing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ThumbsUp className="h-5 w-5" />
            Customer Satisfaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((score) => (
                <Star
                  key={score}
                  className={cn(
                    "h-6 w-6",
                    score <= existingScore
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="text-sm font-medium">
              {existingScore}/5 - {scoreLabels[existingScore]}
            </span>
          </div>
          
          {existingFeedback && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                {existingFeedback}
              </p>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Update Rating
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Edit/Collection mode
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ThumbsUp className="h-5 w-5 text-primary" />
          Customer Satisfaction
        </CardTitle>
        <CardDescription>
          Rate the support experience for ticket #{ticketNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <Label>How satisfied was the customer?</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setSelectedScore(score)}
                className={cn(
                  "p-2 rounded-lg transition-all hover:scale-110",
                  selectedScore && score <= selectedScore
                    ? scoreColors[selectedScore]
                    : "text-gray-300 hover:text-gray-400"
                )}
                disabled={isSubmitting}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-all",
                    selectedScore && score <= selectedScore && "fill-current"
                  )}
                />
              </button>
            ))}
          </div>
          {selectedScore && (
            <p className={cn("text-sm font-medium", scoreColors[selectedScore])}>
              {scoreLabels[selectedScore]}
            </p>
          )}
        </div>

        {/* Feedback */}
        <div className="space-y-2">
          <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
          <Textarea
            id="feedback"
            placeholder="Any comments from the customer..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {existingScore && (
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setSelectedScore(existingScore);
                setFeedback(existingFeedback || "");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!selectedScore || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingScore ? "Update Rating" : "Save Rating"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
