"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  total: number | string;
  currency: string;
}

interface OpportunityInvoicesProps {
  invoices: Invoice[];
  opportunityId: string;
  accountId: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-500/10 text-slate-500",
  SENT: "bg-blue-500/10 text-blue-500",
  VIEWED: "bg-purple-500/10 text-purple-500",
  PAID: "bg-green-500/10 text-green-500",
  PARTIALLY_PAID: "bg-yellow-500/10 text-yellow-500",
  OVERDUE: "bg-red-500/10 text-red-500",
  CANCELLED: "bg-slate-500/10 text-slate-500",
  VOID: "bg-slate-500/10 text-slate-500",
};

function formatCurrency(value: number | string, currency: string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function OpportunityInvoices({ invoices, opportunityId, accountId }: OpportunityInvoicesProps) {
  // Calculate totals
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + (typeof inv.total === "string" ? parseFloat(inv.total) : inv.total),
    0
  );
  const paidAmount = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + (typeof inv.total === "string" ? parseFloat(inv.total) : inv.total), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount, "USD")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount, "USD")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/sales/invoices/new?accountId=${accountId}&opportunityId=${opportunityId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              Create an invoice linked to this opportunity.
            </p>
            <Button asChild>
              <Link href={`/sales/invoices/new?accountId=${accountId}&opportunityId=${opportunityId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Invoice
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/sales/invoices/${invoice.id}`}
                      className="hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[invoice.status]}>
                      {invoice.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/sales/invoices/${invoice.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
