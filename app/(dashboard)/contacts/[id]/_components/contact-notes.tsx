"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  createdById: string;
  createdByType: string;
  createdAt: Date;
}

interface ContactNotesProps {
  contactId: string;
  notes: Note[];
  userId: string;
}

export function ContactNotes({ contactId, notes, userId }: ContactNotesProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote,
          contactId,
        }),
      });

      if (!response.ok) throw new Error("Failed to add note");

      toast.success("Note added");
      setNewNote("");
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note Button/Form */}
      {isAdding ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="Write a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Note
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No notes yet. Add your first note above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {note.createdByType === "AI_AGENT" ? "AI" : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {note.createdByType === "AI_AGENT"
                          ? "AI Assistant"
                          : "You"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
