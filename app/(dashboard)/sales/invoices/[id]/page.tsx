"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { formatCurrency, getStatusInfo } from "@/lib/invoices";
import { InvoiceActions } from "./_components/invoice-actions";
import { RecordPaymentDialog } from "./_components/record-payment-dialog";

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
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
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
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    itemCode?: string;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string;
    notes?: string;
  }[];
}

interface PageProps {
  params: Promise<{ id: string }>;
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

export default function InvoiceDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) {
        throw new Error("Invoice not found");
      }
      const data = await response.json();
      
      // Convert Decimal fields to numbers
      setInvoice({
        ...data,
        subtotal: Number(data.subtotal),
        taxAmount: Number(data.taxAmount),
        discountAmount: Number(data.discountAmount),
        total: Number(data.total),
        amountPaid: Number(data.amountPaid),
        amountDue: Number(data.amountDue),
        taxRate: data.taxRate ? Number(data.taxRate) : undefined,
        discountValue: data.discountValue ? Number(data.discountValue) : undefined,
        items: data.items.map((item: Record<string, unknown>) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
        })),
        payments: data.payments.map((payment: Record<string, unknown>) => ({
          ...payment,
          amount: Number(payment.amount),
        })),
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
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

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Invoice not found</h2>
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
            <p className="text-muted-foreground">
              {invoice.account.name}
            </p>
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
                        {invoice.discountType === "PERCENTAGE" && ` (${invoice.discountValue}%)`}
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
                        <h3 className="text-sm font-medium mb-2">Terms & Conditions</h3>
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
