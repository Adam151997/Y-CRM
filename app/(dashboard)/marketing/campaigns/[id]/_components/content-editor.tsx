"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Edit2, X } from "lucide-react";

interface CampaignContent {
  notes?: string;
  goals?: string;
  targetAudience?: string;
  keyMessages?: string;
  callToAction?: string;
}

interface ContentEditorProps {
  campaignId: string;
  subject: string | null;
  content: CampaignContent | null;
  campaignType: string;
}

export function ContentEditor({ campaignId, subject, content, campaignType }: ContentEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    subject: subject || "",
    notes: content?.notes || "",
    goals: content?.goals || "",
    targetAudience: content?.targetAudience || "",
    keyMessages: content?.keyMessages || "",
    callToAction: content?.callToAction || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.subject || null,
          content: {
            notes: formData.notes,
            goals: formData.goals,
            targetAudience: formData.targetAudience,
            keyMessages: formData.keyMessages,
            callToAction: formData.callToAction,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasContent = formData.notes || formData.goals || formData.targetAudience || formData.keyMessages || formData.callToAction;

  if (!isEditing && !hasContent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground mb-4">No campaign content or notes yet</p>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Add Content & Notes
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campaign Content</CardTitle>
            <CardDescription>Planning notes and messaging</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.subject && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Subject / Headline</span>
              <p className="mt-1">{formData.subject}</p>
            </div>
          )}
          {formData.goals && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Goals</span>
              <p className="mt-1 whitespace-pre-wrap">{formData.goals}</p>
            </div>
          )}
          {formData.targetAudience && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Target Audience</span>
              <p className="mt-1 whitespace-pre-wrap">{formData.targetAudience}</p>
            </div>
          )}
          {formData.keyMessages && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Key Messages</span>
              <p className="mt-1 whitespace-pre-wrap">{formData.keyMessages}</p>
            </div>
          )}
          {formData.callToAction && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Call to Action</span>
              <p className="mt-1 whitespace-pre-wrap">{formData.callToAction}</p>
            </div>
          )}
          {formData.notes && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Internal Notes</span>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{formData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Edit Campaign Content</CardTitle>
          <CardDescription>Plan your campaign messaging and track notes</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject/Headline */}
        <div className="space-y-2">
          <Label htmlFor="subject">
            {campaignType === "EMAIL" ? "Email Subject" : "Campaign Headline"}
          </Label>
          <Input
            id="subject"
            placeholder={campaignType === "EMAIL" ? "Enter email subject line..." : "Enter campaign headline..."}
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <Label htmlFor="goals">Campaign Goals</Label>
          <Textarea
            id="goals"
            placeholder="What do you want to achieve with this campaign?"
            rows={2}
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target Audience</Label>
          <Textarea
            id="targetAudience"
            placeholder="Describe your target audience for this campaign..."
            rows={2}
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
          />
        </div>

        {/* Key Messages */}
        <div className="space-y-2">
          <Label htmlFor="keyMessages">Key Messages</Label>
          <Textarea
            id="keyMessages"
            placeholder="What are the main points you want to communicate?"
            rows={3}
            value={formData.keyMessages}
            onChange={(e) => setFormData({ ...formData, keyMessages: e.target.value })}
          />
        </div>

        {/* Call to Action */}
        <div className="space-y-2">
          <Label htmlFor="callToAction">Call to Action</Label>
          <Input
            id="callToAction"
            placeholder="e.g., Sign up now, Learn more, Get started..."
            value={formData.callToAction}
            onChange={(e) => setFormData({ ...formData, callToAction: e.target.value })}
          />
        </div>

        {/* Internal Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Internal Notes</Label>
          <Textarea
            id="notes"
            placeholder="Private notes for your team (not visible to recipients)..."
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
