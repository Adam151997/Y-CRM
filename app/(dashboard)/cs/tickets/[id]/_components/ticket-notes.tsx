"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, Paperclip } from "lucide-react";
import { JsonValue } from "@prisma/client/runtime/library";

interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface Note {
  id: string;
  content: string;
  contentHtml: string | null;
  isInternal: boolean;
  authorId: string;
  authorType: string;
  authorName: string | null;
  attachments: JsonValue;
  createdAt: Date;
}

interface TicketNotesProps {
  messages: Note[];
}

export function TicketNotes({ messages }: TicketNotesProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No notes yet. Add the first note below.</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {messages.map((note) => {
        const isAI = note.authorType === "AI_AGENT";
        
        // Get initials for avatar
        const getInitials = () => {
          if (isAI) return "AI";
          if (note.authorName) {
            const parts = note.authorName.split(" ");
            return parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
          }
          return "U";
        };

        const rawAttachments = note.attachments;
        const attachments: Attachment[] = Array.isArray(rawAttachments) 
          ? (rawAttachments as unknown as Attachment[]) 
          : [];

        return (
          <div
            key={note.id}
            className="flex gap-3 p-4 rounded-lg bg-muted/50"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback 
                className={cn(
                  "text-xs",
                  isAI 
                    ? "bg-violet-100 text-violet-700" 
                    : "bg-primary/10 text-primary"
                )}
              >
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {note.authorName || "Team Member"}
                </span>
                
                {isAI && (
                  <Badge variant="secondary" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
                
                <span className="text-xs text-muted-foreground">
                  {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              
              {note.contentHtml ? (
                <div 
                  className="text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.contentHtml }}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-accent transition-colors text-sm"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(attachment.size)})
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
