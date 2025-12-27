"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ImportModule = "leads" | "contacts" | "accounts" | "tasks" | "inventory" | "opportunities" | "employees";

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ImportDialogProps {
  module?: ImportModule;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const MODULE_OPTIONS = [
  { value: "leads", label: "Leads" },
  { value: "contacts", label: "Contacts" },
  { value: "accounts", label: "Accounts" },
  { value: "tasks", label: "Tasks" },
  { value: "inventory", label: "Inventory" },
  { value: "opportunities", label: "Opportunities" },
  { value: "employees", label: "Employees" },
];

const SAMPLE_HEADERS: Record<ImportModule, string> = {
  leads: "First Name,Last Name,Email,Phone,Company,Title,Source,Status",
  contacts: "First Name,Last Name,Email,Phone,Title,Department",
  accounts: "Name,Website,Phone,Industry,Type,Annual Revenue,Employee Count",
  tasks: "Title,Description,Due Date,Priority,Status,Task Type",
  inventory: "SKU,Name,Description,Category,Unit Price,Cost Price,Quantity,Reorder Level",
  opportunities: "Name,Value,Currency,Probability,Expected Close Date,Stage",
  employees: "Employee ID,First Name,Last Name,Email,Phone,Department,Position,Employment Type,Salary,Currency,Join Date",
};

export function ImportDialog({ module: defaultModule, onSuccess, trigger }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [module, setModule] = useState<ImportModule | "">(defaultModule || "");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleImport = async () => {
    if (!file || !module) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("module", module);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);

      if (data.success) {
        toast.success(`Successfully imported ${data.imported} records`);
        onSuccess?.();
      } else {
        toast.warning(`Imported ${data.imported} records with ${data.failed} errors`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    if (!module) return;
    
    const headers = SAMPLE_HEADERS[module];
    const blob = new Blob([headers + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${module}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setResult(null);
    if (!defaultModule) setModule("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import records into your CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Module selector */}
          {!defaultModule && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Module</label>
              <Select value={module} onValueChange={(v) => setModule(v as ImportModule)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose what to import" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Download template button */}
          {module && (
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={downloadTemplate}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Download {module} template
            </Button>
          )}

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              !module && "opacity-50 pointer-events-none"
            )}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">
                  {isDragActive ? "Drop your file here" : "Drag & drop your CSV file"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Progress / Results */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Importing records...
              </p>
            </div>
          )}

          {result && (
            <div
              className={cn(
                "p-4 rounded-lg",
                result.success ? "bg-green-500/10" : "bg-yellow-500/10"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="font-medium">
                  {result.success ? "Import Complete" : "Import Completed with Errors"}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-green-600">✓ {result.imported} records imported</p>
                {result.failed > 0 && (
                  <p className="text-red-600">✗ {result.failed} records failed</p>
                )}
                {result.errors.length > 0 && result.errors.length <= 5 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {result.errors.map((err, i) => (
                      <p key={i}>Row {err.row}: {err.error}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button
                onClick={handleImport}
                disabled={!file || !module || isUploading}
              >
                {isUploading ? "Importing..." : "Import"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
