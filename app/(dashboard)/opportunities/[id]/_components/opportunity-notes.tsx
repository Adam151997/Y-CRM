"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Loader2, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  createdById: string;
  createdByType: string;
  createdAt: Date;
}

interface OpportunityNotesProps {
  opportunityId: string;
  initialNotes: Note[];
}

export function OpportunityNotes({ opportunityId, initialNotes }: OpportunityNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote,
          opportunityId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      const note = await response.json();
      setNotes([note, ...notes]);
      setNewNote("");
      setShowForm(false);
      toast.success("Note added");
      router.refresh();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notes</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Write a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting || !newNote.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Note
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setNewNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {notes.length === 0 && !showForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {note.createdByType === "AI_AGENT" ? "AI" : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {note.createdByType === "AI_AGENT" ? "AI Agent" : "You"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
