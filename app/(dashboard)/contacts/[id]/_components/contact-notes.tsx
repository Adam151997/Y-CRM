"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  Loader2, 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon,
  File,
  Download 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface Note {
  id: string;
  content: string;
  attachments?: unknown; // JsonValue from Prisma
  createdById: string;
  createdByType: string;
  createdAt: Date;
}

interface ContactNotesProps {
  contactId: string;
  notes: Note[];
  userId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (type === "application/pdf") return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

export function ContactNotes({ contactId, notes, userId }: ContactNotesProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<Attachment[]> => {
    if (attachments.length === 0) return [];
    const uploaded: Attachment[] = [];
    for (const file of attachments) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        uploaded.push({ name: file.name, url: data.file.url, size: file.size, type: file.type });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    return uploaded;
  };

  const handleAddNote = async () => {
    if (!newNote.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    setUploading(attachments.length > 0);
    
    try {
      const uploadedAttachments = await uploadFiles();
      setUploading(false);

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote || "(Attachment)",
          contactId,
          attachments: uploadedAttachments,
        }),
      });

      if (!response.ok) throw new Error("Failed to add note");

      toast.success("Note added");
      setNewNote("");
      setAttachments([]);
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
      setUploading(false);
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
            
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
                    {getFileIcon(file.type)}
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                    <button onClick={() => removeAttachment(index)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setIsAdding(false); setNewNote(""); setAttachments([]); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={isSubmitting || (!newNote.trim() && attachments.length === 0)}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading ? "Uploading..." : "Save Note"}
                </Button>
              </div>
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
          {notes.map((note) => {
            const noteAttachments = (note.attachments || []) as Attachment[];
            return (
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
                          {note.createdByType === "AI_AGENT" ? "AI Assistant" : "You"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      
                      {/* Note Attachments */}
                      {noteAttachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {noteAttachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-sm transition-colors"
                            >
                              {getFileIcon(attachment.type)}
                              <span className="max-w-[150px] truncate">{attachment.name}</span>
                              <Download className="h-3 w-3 text-muted-foreground" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
