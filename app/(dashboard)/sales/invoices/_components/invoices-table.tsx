"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Send, Trash2, FileText } from "lucide-react";
import { formatCurrency, getStatusInfo } from "@/lib/invoices";
import { Decimal } from "@prisma/client/runtime/library";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: Decimal | number;
  amountDue: Decimal | number;
  currency: string;
  account: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  _count: {
    items: number;
    payments: number;
  };
}

interface InvoicesTableProps {
  invoices: Invoice[];
  onDelete?: (id: string) => void;
  onSend?: (id: string) => void;
}

export function InvoicesTable({ invoices, onDelete, onSend }: InvoicesTableProps) {
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/sales/invoices/${id}`);
  };

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No invoices found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first invoice to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Issue Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Due</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const statusInfo = getStatusInfo(invoice.status);
          const total = typeof invoice.total === 'number' 
            ? invoice.total 
            : invoice.total.toNumber();
          const amountDue = typeof invoice.amountDue === 'number'
            ? invoice.amountDue
            : invoice.amountDue.toNumber();

          return (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(invoice.id)}
            >
              <TableCell className="font-medium">
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{invoice.account.name}</div>
                  {invoice.contact && (
                    <div className="text-sm text-muted-foreground">
                      {invoice.contact.firstName} {invoice.contact.lastName}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(invoice.issueDate).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(total, invoice.currency)}
              </TableCell>
              <TableCell className="text-right">
                {amountDue > 0 ? (
                  <span className={invoice.status === "OVERDUE" ? "text-red-600 font-medium" : ""}>
                    {formatCurrency(amountDue, invoice.currency)}
                  </span>
                ) : (
                  <span className="text-green-600">Paid</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sales/invoices/${invoice.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {invoice.status === "DRAFT" && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/sales/invoices/${invoice.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {["DRAFT", "SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status) && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onSend?.(invoice.id);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {invoice.status === "DRAFT" && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(invoice.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
