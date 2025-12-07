"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createDocument } from "../_actions";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  accountId?: string;
}

interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  leadId,
  accountId,
}: UploadDialogProps) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState("OTHER");
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
    maxSize: 16 * 1024 * 1024, // 16MB
  });

  const removeFile = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (uploads.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      if (upload.status !== "pending") continue;

      // Update status to uploading
      setUploads((prev) =>
        prev.map((u, idx) =>
          idx === i ? { ...u, status: "uploading" as const, progress: 10 } : u
        )
      );

      try {
        // Create form data
        const formData = new FormData();
        formData.append("file", upload.file);

        // Upload to R2
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();

        // Update progress
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === i ? { ...u, progress: 70 } : u
          )
        );

        // Save to database
        const result = await createDocument({
          name: upload.file.name,
          type: documentType,
          fileUrl: data.file.url,
          fileKey: data.file.key,
          fileSize: upload.file.size,
          mimeType: upload.file.type,
          leadId,
          accountId,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to save document");
        }

        // Mark as success
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === i ? { ...u, status: "success" as const, progress: 100 } : u
          )
        );
      } catch (error) {
        // Mark as error
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === i
              ? {
                  ...u,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : u
          )
        );
      }
    }

    setIsUploading(false);

    // Check if all successful
    const allSuccess = uploads.every((u) => u.status === "success");
    if (allSuccess) {
      toast.success(`${uploads.length} file(s) uploaded successfully`);
      router.refresh();
      onOpenChange(false);
      setUploads([]);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
      setUploads([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload files to your CRM. Supported: PDF, Word, Excel, PowerPoint, images (max 16MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="PROPOSAL">Proposal</SelectItem>
                <SelectItem value="INVOICE">Invoice</SelectItem>
                <SelectItem value="PRESENTATION">Presentation</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-primary">Drop files here...</p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Excel, PowerPoint, Images (max 16MB)
                </p>
              </>
            )}
          </div>

          {/* File list */}
          {uploads.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uploads.map((upload, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {upload.file.name}
                    </p>
                    {upload.status === "uploading" && (
                      <Progress value={upload.progress} className="h-1 mt-1" />
                    )}
                    {upload.status === "error" && (
                      <p className="text-xs text-destructive">{upload.error}</p>
                    )}
                  </div>
                  {upload.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : upload.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {uploads.length > 0 && (
            <Button
              className="w-full"
              onClick={uploadFiles}
              disabled={isUploading || uploads.every((u) => u.status === "success")}
            >
              {isUploading ? "Uploading..." : `Upload ${uploads.length} file(s)`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
