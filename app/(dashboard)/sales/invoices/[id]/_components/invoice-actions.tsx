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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Send,
  Edit,
  Trash2,
  XCircle,
  Loader2,
  Download,
  DollarSign,
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
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(invoice.contact?.email || "");
  const [sendMessage, setSendMessage] = useState("");

  const canEdit = invoice.status === "DRAFT";
  const canSend = ["DRAFT", "SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status);
  const canDelete = invoice.status === "DRAFT";
  const canVoid = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status);
  const canRecordPayment = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status);

  const handleSend = async () => {
    if (!sendEmail) {
      toast.error("Email address is required");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendEmail,
          message: sendMessage || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invoice");
      }

      toast.success(`Invoice sent to ${sendEmail}`);
      setSendDialogOpen(false);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    } finally {
      setSending(false);
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
    <>
      <div className="flex gap-2">
        {canSend && (
          <Button onClick={() => setSendDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
        )}

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
            <DropdownMenuItem disabled>
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

      {/* Send Invoice Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send invoice {invoice.invoiceNumber} via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
