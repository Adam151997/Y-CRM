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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, FileText, Copy, Download } from "lucide-react";
import { formatCurrency, getStatusInfo } from "@/lib/invoices/client-utils";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountDue: number;
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
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export function InvoicesTable({ 
  invoices, 
  selectedIds, 
  onSelectionChange, 
  onDelete,
  onRefresh,
}: InvoicesTableProps) {
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/sales/invoices/${id}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(invoices.map((inv) => inv.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/duplicate`, {
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
    }
  };

  const handleDownloadPDF = (id: string) => {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  };

  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < invoices.length;

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
          <TableHead className="w-[50px]">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                }
              }}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
          </TableHead>
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
          const isSelected = selectedIds.includes(invoice.id);

          return (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              data-state={isSelected ? "selected" : undefined}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectOne(invoice.id, !!checked)}
                  aria-label={`Select ${invoice.invoiceNumber}`}
                />
              </TableCell>
              <TableCell 
                className="font-medium"
                onClick={() => handleRowClick(invoice.id)}
              >
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell onClick={() => handleRowClick(invoice.id)}>
                <div>
                  <div className="font-medium">{invoice.account.name}</div>
                  {invoice.contact && (
                    <div className="text-sm text-muted-foreground">
                      {invoice.contact.firstName} {invoice.contact.lastName}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell onClick={() => handleRowClick(invoice.id)}>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              </TableCell>
              <TableCell onClick={() => handleRowClick(invoice.id)}>
                {new Date(invoice.issueDate).toLocaleDateString()}
              </TableCell>
              <TableCell onClick={() => handleRowClick(invoice.id)}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell 
                className="text-right font-medium"
                onClick={() => handleRowClick(invoice.id)}
              >
                {formatCurrency(invoice.total, invoice.currency)}
              </TableCell>
              <TableCell 
                className="text-right"
                onClick={() => handleRowClick(invoice.id)}
              >
                {invoice.amountDue > 0 ? (
                  <span className={invoice.status === "OVERDUE" ? "text-red-600 font-medium" : ""}>
                    {formatCurrency(invoice.amountDue, invoice.currency)}
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
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(invoice.id);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(invoice.id);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
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
