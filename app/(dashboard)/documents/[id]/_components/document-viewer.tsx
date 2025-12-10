"use client";

import { useState, useEffect } from "react";
import { FileText, Image as ImageIcon, FileSpreadsheet, File, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentViewerProps {
  url: string;
  mimeType: string;
  fileName: string;
}

export function DocumentViewer({ url, mimeType, fileName }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Check if it's an image
  const isImage = mimeType.startsWith("image/");
  
  // Check if it's a PDF
  const isPdf = mimeType === "application/pdf";
  
  // Check if it's viewable with Google Docs Viewer
  const isOfficeDoc = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ].includes(mimeType);

  // Check if it's plain text
  const isText = mimeType === "text/plain" || mimeType === "text/csv";

  // Google Docs Viewer URL
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  // Render image viewer
  if (isImage) {
    return (
      <div className="relative min-h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-[80vh] object-contain"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
        {error && <ErrorState fileName={fileName} url={url} />}
      </div>
    );
  }

  // Render PDF with native browser viewer or Google Docs as fallback
  if (isPdf) {
    return (
      <div className="relative min-h-[700px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          </div>
        )}
        <iframe
          src={url}
          className="w-full h-[700px] rounded-lg border-0"
          title={fileName}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
        {error && <ErrorState fileName={fileName} url={url} />}
      </div>
    );
  }

  // Render Office documents with Google Docs Viewer
  if (isOfficeDoc) {
    return (
      <div className="relative min-h-[700px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading document...</p>
              <p className="text-xs text-muted-foreground mt-1">Powered by Google Docs Viewer</p>
            </div>
          </div>
        )}
        <iframe
          src={googleViewerUrl}
          className="w-full h-[700px] rounded-lg border-0"
          title={fileName}
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  // Render text files
  if (isText) {
    return <TextViewer url={url} fileName={fileName} />;
  }

  // Fallback for unsupported types
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 text-center">
      <File className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Preview not available</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        This file type ({mimeType}) cannot be previewed in the browser. 
        Please download the file to view it.
      </p>
      <Button asChild>
        <a href={url} download={fileName}>
          Download File
        </a>
      </Button>
    </div>
  );
}

// Text file viewer component
function TextViewer({ url, fileName }: { url: string; fileName: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch text content
  useEffect(() => {
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading text file...</p>
        </div>
      </div>
    );
  }

  if (error || content === null) {
    return <ErrorState fileName={fileName} url={url} />;
  }

  return (
    <div className="min-h-[400px] max-h-[700px] overflow-auto bg-muted/30 rounded-lg">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}

// Error state component
function ErrorState({ fileName, url }: { fileName: string; url: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 text-center">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h3 className="text-lg font-medium mb-2">Failed to load preview</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        There was an error loading the preview. The file may have been moved or deleted.
      </p>
      <Button asChild>
        <a href={url} download={fileName}>
          Try Downloading
        </a>
      </Button>
    </div>
  );
}
