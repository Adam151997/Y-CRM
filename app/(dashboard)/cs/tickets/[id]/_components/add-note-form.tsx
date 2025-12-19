"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Paperclip, X, FileText, Image, File } from "lucide-react";

interface AddNoteFormProps {
  ticketId: string;
}

interface PendingFile {
  file: File;
  preview?: string;
}

export function AddNoteForm({ ticketId }: AddNoteFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type.includes("pdf") || type.includes("document")) return FileText;
    return File;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles: PendingFile[] = [];
    
    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }
      
      const pending: PendingFile = { file };
      
      // Create preview for images
      if (file.type.startsWith("image/")) {
        pending.preview = URL.createObjectURL(file);
      }
      
      validFiles.push(pending);
    }

    setPendingFiles((prev) => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      // Revoke object URL if exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFile = async (file: File): Promise<{ url: string; key: string } | null> => {
    try {
      // Get presigned URL
      const presignRes = await fetch("/api/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl, fileKey } = await presignRes.json();

      // Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      return { url: fileUrl, key: fileKey };
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && pendingFiles.length === 0) {
      toast.error("Please enter a note or attach a file");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload files first
      const attachments: { name: string; url: string; size: number; type: string }[] = [];
      
      for (const pending of pendingFiles) {
        const result = await uploadFile(pending.file);
        if (result) {
          attachments.push({
            name: pending.file.name,
            url: result.url,
            size: pending.file.size,
            type: pending.file.type,
          });
        } else {
          toast.error(`Failed to upload ${pending.file.name}`);
        }
      }

      // Create the note
      const response = await fetch(`/api/cs/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || (attachments.length > 0 ? `Added ${attachments.length} attachment(s)` : ""),
          isInternal: true, // Always internal now
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      toast.success("Note added");
      setContent("");
      
      // Clean up file previews
      pendingFiles.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
      setPendingFiles([]);
      
      router.refresh();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Add a note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={isSubmitting}
      />

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((pending, index) => {
            const FileIcon = getFileIcon(pending.file.type);
            return (
              <div
                key={index}
                className="relative flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50"
              >
                {pending.preview ? (
                  <img
                    src={pending.preview}
                    alt={pending.file.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                ) : (
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm max-w-[120px] truncate">
                    {pending.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(pending.file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-2 p-1 hover:bg-destructive/10 rounded"
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        {/* File Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach Files
          </Button>
        </div>
        
        <Button type="submit" disabled={isSubmitting || (!content.trim() && pendingFiles.length === 0)}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Add Note
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
