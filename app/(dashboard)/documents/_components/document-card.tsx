"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  MoreVertical,
  ExternalLink,
  Building2,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { deleteDocument } from "../_actions";
import { toast } from "sonner";

interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    type: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    createdAt: Date;
    lead?: { id: string; firstName: string; lastName: string } | null;
    account?: { id: string; name: string } | null;
  };
}

const typeColors: Record<string, string> = {
  CONTRACT: "bg-blue-100 text-blue-800",
  PROPOSAL: "bg-purple-100 text-purple-800",
  INVOICE: "bg-green-100 text-green-800",
  PRESENTATION: "bg-orange-100 text-orange-800",
  OTHER: "bg-gray-100 text-gray-800",
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document"))
    return FileText;
  return File;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const FileIcon = getFileIcon(document.mimeType);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    const result = await deleteDocument(document.id);
    if (result.success) {
      toast.success("Document deleted");
    } else {
      toast.error(result.error || "Failed to delete document");
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-muted">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={document.fileUrl} download={document.name}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-medium truncate mb-1" title={document.name}>
          {document.name}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className={typeColors[document.type]}>
            {document.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatBytes(document.fileSize)}
          </span>
        </div>

        {(document.lead || document.account) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {document.lead ? (
              <>
                <User className="h-3 w-3" />
                <span>
                  {document.lead.firstName} {document.lead.lastName}
                </span>
              </>
            ) : document.account ? (
              <>
                <Building2 className="h-3 w-3" />
                <span>{document.account.name}</span>
              </>
            ) : null}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 py-3 border-t bg-muted/50">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(document.createdAt), {
            addSuffix: true,
          })}
        </span>
      </CardFooter>
    </Card>
  );
}
