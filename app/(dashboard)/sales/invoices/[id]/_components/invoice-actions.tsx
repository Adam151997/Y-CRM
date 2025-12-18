"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  XCircle,
  Loader2,
  Download,
  DollarSign,
  Copy,
} from "lucide-react";

interface InvoiceActionsProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    contact?: {
      email?: string;
      firstName: string;
      lastName: string;
    } | null;
  };
  onUpdate: () => void;
}

export function InvoiceActions({ invoice, onUpdate }: InvoiceActionsProps) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  const canEdit = invoice.status === "DRAFT";
  const canDelete = invoice.status === "DRAFT";
  const canVoid = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status);
  const canRecordPayment = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status);

  const handleDownloadPDF = () => {
    // Open PDF in new tab for printing/saving
    window.open(`/api/invoices/${invoice.id}/pdf`, "_blank");
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to duplicate invoice");
      }

      const data = await response.json();
      toast.success(`Invoice duplicated as ${data.invoice.invoiceNumber}`);
      router.push(`/sales/invoices/${data.invoice.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate invoice");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete invoice");
      }

      toast.success("Invoice deleted");
      router.push("/sales/invoices");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice");
    }
  };

  const handleVoid = async () => {
    if (!confirm("Are you sure you want to void this invoice? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "VOID" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to void invoice");
      }

      toast.success("Invoice voided");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to void invoice");
    }
  };

  return (
    <div className="flex gap-2">
      {canRecordPayment && (
        <Button
          variant="outline"
          onClick={() => router.push(`/sales/invoices/${invoice.id}#payments`)}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem
              onClick={() => router.push(`/sales/invoices/${invoice.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {canVoid && (
            <DropdownMenuItem onClick={handleVoid} className="text-orange-600">
              <XCircle className="h-4 w-4 mr-2" />
              Void Invoice
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
