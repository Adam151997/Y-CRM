"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Building2, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InvoiceActions } from "./_components/invoice-actions";
import { RecordPaymentDialog } from "./_components/record-payment-dialog";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemCode?: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
  notes?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  sentAt?: string;
  paidAt?: string;
  currency: string;
  subtotal: number;
  taxRate?: number;
  taxAmount: number;
  discountType?: string;
  discountValue?: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  terms?: string;
  billingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  account: {
    id: string;
    name: string;
    phone?: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  opportunity?: {
    id: string;
    name: string;
    value: number;
  };
  items: InvoiceItem[];
  payments: Payment[];
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  BANK_TRANSFER: "Bank Transfer",
  PAYPAL: "PayPal",
  STRIPE: "Stripe",
  OTHER: "Other",
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-700" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "VIEWED", label: "Viewed", color: "bg-purple-100 text-purple-700" },
  { value: "PAID", label: "Paid", color: "bg-green-100 text-green-700" },
  { value: "PARTIALLY_PAID", label: "Partially Paid", color: "bg-yellow-100 text-yellow-700" },
  { value: "OVERDUE", label: "Overdue", color: "bg-red-100 text-red-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-100 text-gray-700" },
  { value: "VOID", label: "Void", color: "bg-gray-100 text-gray-700" },
];

function getStatusInfo(status: string) {
  const found = STATUS_OPTIONS.find(s => s.value === status);
  return {
    label: found?.label || status,
    color: found?.color?.split(" ")[1] || "text-gray-700",
    bgColor: found?.color?.split(" ")[0] || "bg-gray-100",
  };
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function safeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return "";
  return String(val);
}

function safeNumber(val: unknown): number {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function parseInvoiceData(data: Record<string, unknown>): Invoice {
  const account = data.account as Record<string, unknown> || {};
  const contact = data.contact as Record<string, unknown> | null;
  const opportunity = data.opportunity as Record<string, unknown> | null;
  const billingAddr = data.billingAddress as Record<string, unknown> | null;
  const items = (data.items as Record<string, unknown>[]) || [];
  const payments = (data.payments as Record<string, unknown>[]) || [];

  return {
    id: safeString(data.id),
    invoiceNumber: safeString(data.invoiceNumber),
    status: safeString(data.status) || "DRAFT",
    issueDate: safeString(data.issueDate),
    dueDate: safeString(data.dueDate),
    sentAt: data.sentAt ? safeString(data.sentAt) : undefined,
    paidAt: data.paidAt ? safeString(data.paidAt) : undefined,
    currency: safeString(data.currency) || "USD",
    subtotal: safeNumber(data.subtotal),
    taxRate: data.taxRate ? safeNumber(data.taxRate) : undefined,
    taxAmount: safeNumber(data.taxAmount),
    discountType: data.discountType ? safeString(data.discountType) : undefined,
    discountValue: data.discountValue ? safeNumber(data.discountValue) : undefined,
    discountAmount: safeNumber(data.discountAmount),
    total: safeNumber(data.total),
    amountPaid: safeNumber(data.amountPaid),
    amountDue: safeNumber(data.amountDue),
    notes: data.notes ? safeString(data.notes) : undefined,
    terms: data.terms ? safeString(data.terms) : undefined,
    billingAddress: billingAddr ? {
      name: safeString(billingAddr.name),
      street: safeString(billingAddr.street),
      city: safeString(billingAddr.city),
      state: safeString(billingAddr.state),
      zip: safeString(billingAddr.zip),
      country: safeString(billingAddr.country),
    } : undefined,
    account: {
      id: safeString(account.id),
      name: safeString(account.name),
      phone: account.phone ? safeString(account.phone) : undefined,
    },
    contact: contact ? {
      id: safeString(contact.id),
      firstName: safeString(contact.firstName),
      lastName: safeString(contact.lastName),
      email: contact.email ? safeString(contact.email) : undefined,
      phone: contact.phone ? safeString(contact.phone) : undefined,
    } : undefined,
    opportunity: opportunity ? {
      id: safeString(opportunity.id),
      name: safeString(opportunity.name),
      value: safeNumber(opportunity.value),
    } : undefined,
    items: items.map((item) => ({
      id: safeString(item.id),
      description: safeString(item.description),
      quantity: safeNumber(item.quantity),
      unitPrice: safeNumber(item.unitPrice),
      amount: safeNumber(item.amount),
      itemCode: item.itemCode ? safeString(item.itemCode) : undefined,
    })),
    payments: payments.map((payment) => ({
      id: safeString(payment.id),
      amount: safeNumber(payment.amount),
      paymentDate: safeString(payment.paymentDate),
      method: safeString(payment.method),
      reference: payment.reference ? safeString(payment.reference) : undefined,
      notes: payment.notes ? safeString(payment.notes) : undefined,
    })),
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchInvoice = async () => {
    if (!id) {
      setError("Invalid invoice ID");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) {
        throw new Error("Invoice not found");
      }
      const data = await response.json();
      const parsed = parseInvoiceData(data);
      setInvoice(parsed);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      setError(err instanceof Error ? err.message : "Failed to load invoice");
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice || newStatus === invoice.status) return;
    
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`Status updated to ${statusLabel}`);
      fetchInvoice();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">{error || "Invoice not found"}</h2>
        <Button asChild className="mt-4">
          <Link href="/sales/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
              <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{invoice.account.name}</p>
          </div>
        </div>
        <InvoiceActions invoice={invoice} onUpdate={fetchInvoice} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Invoice Details Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Bill To */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill To</h3>
                  <div className="space-y-1">
                    <p className="font-medium">{invoice.billingAddress?.name || invoice.account.name}</p>
                    {invoice.contact && (
                      <p className="text-sm">
                        Attn: {invoice.contact.firstName} {invoice.contact.lastName}
                      </p>
                    )}
                    {invoice.billingAddress?.street && (
                      <p className="text-sm text-muted-foreground">{invoice.billingAddress.street}</p>
                    )}
                    {(invoice.billingAddress?.city || invoice.billingAddress?.state) && (
                      <p className="text-sm text-muted-foreground">
                        {[invoice.billingAddress.city, invoice.billingAddress.state, invoice.billingAddress.zip]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {invoice.contact?.email && (
                      <p className="text-sm text-muted-foreground">{invoice.contact.email}</p>
                    )}
                  </div>
                </div>

                {/* Invoice Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Number:</span>
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issue Date:</span>
                    <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className={invoice.status === "OVERDUE" ? "text-red-600 font-medium" : ""}>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  {invoice.sentAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent:</span>
                      <span>{new Date(invoice.sentAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {invoice.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid:</span>
                      <span className="text-green-600">{new Date(invoice.paidAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Line Items */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.itemCode && (
                            <p className="text-sm text-muted-foreground">SKU: {item.itemCode}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="flex justify-end mt-6">
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>
                        Discount
                        {invoice.discountType === "PERCENTAGE" && invoice.discountValue && ` (${invoice.discountValue}%)`}
                      </span>
                      <span>-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tax{invoice.taxRate && ` (${invoice.taxRate}%)`}
                      </span>
                      <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total, invoice.currency)}</span>
                  </div>
                  {invoice.amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Paid</span>
                        <span>-{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Amount Due</span>
                        <span className={invoice.amountDue > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(invoice.amountDue, invoice.currency)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes & Terms */}
              {(invoice.notes || invoice.terms) && (
                <>
                  <Separator className="my-6" />
                  <div className="grid gap-6 md:grid-cols-2">
                    {invoice.notes && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {invoice.notes}
                        </p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Terms &amp; Conditions</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {invoice.terms}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payments Section */}
          <Card id="payments">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              {invoice.amountDue > 0 && ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status) && (
                <RecordPaymentDialog
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoiceNumber}
                  amountDue={invoice.amountDue}
                  currency={invoice.currency}
                  onSuccess={fetchInvoice}
                />
              )}
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payments recorded yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={invoice.status}
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updatingStatus && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/sales/accounts/${invoice.account.id}`}
                className="font-medium hover:underline"
              >
                {invoice.account.name}
              </Link>
              {invoice.account.phone && (
                <p className="text-sm text-muted-foreground mt-1">{invoice.account.phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Contact Card */}
          {invoice.contact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/sales/contacts/${invoice.contact.id}`}
                  className="font-medium hover:underline"
                >
                  {invoice.contact.firstName} {invoice.contact.lastName}
                </Link>
                {invoice.contact.email && (
                  <p className="text-sm text-muted-foreground mt-1">{invoice.contact.email}</p>
                )}
                {invoice.contact.phone && (
                  <p className="text-sm text-muted-foreground">{invoice.contact.phone}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked Opportunity */}
          {invoice.opportunity && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Linked Opportunity</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/sales/opportunities/${invoice.opportunity.id}`}
                  className="font-medium hover:underline"
                >
                  {invoice.opportunity.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Value: {formatCurrency(invoice.opportunity.value, invoice.currency)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
