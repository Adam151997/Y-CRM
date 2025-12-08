"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

interface AddMessageFormProps {
  ticketId: string;
}

export function AddMessageForm({ ticketId }: AddMessageFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/cs/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          isInternal,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add message");
      }

      toast.success(isInternal ? "Internal note added" : "Message sent");
      setContent("");
      setIsInternal(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Type your message..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={isSubmitting}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="internal"
            checked={isInternal}
            onCheckedChange={(checked) => setIsInternal(checked === true)}
            disabled={isSubmitting}
          />
          <Label 
            htmlFor="internal" 
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Internal note (not visible to customer)
          </Label>
        </div>
        
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {isInternal ? "Add Note" : "Send Message"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
