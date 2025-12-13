"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { InvoicesFilters } from "./_components/invoices-filters";
import { InvoicesTable } from "./_components/invoices-table";
import { formatCurrency } from "@/lib/invoices";
import InvoicesLoading from "./loading";

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

interface InvoicesData {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InvoicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(searchParams.toString());
      const response = await fetch(`/api/invoices?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts for filter
  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts?limit=100");
      if (response.ok) {
        const result = await response.json();
        setAccounts(result.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchAccounts();
  }, [searchParams]);

  // Calculate stats
  const stats = {
    total: data?.pagination.total || 0,
    draft: data?.invoices.filter(i => i.status === "DRAFT").length || 0,
    outstanding: data?.invoices
      .filter(i => ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
      .reduce((sum, i) => sum + (typeof i.amountDue === 'number' ? i.amountDue : 0), 0) || 0,
    overdue: data?.invoices.filter(i => i.status === "OVERDUE").length || 0,
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete invoice");
      }

      toast.success("Invoice deleted");
      fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice");
    }
  };

  const handleSend = async (id: string) => {
    const invoice = data?.invoices.find(i => i.id === id);
    if (!invoice) return;

    const email = invoice.contact?.email;
    if (!email) {
      toast.error("No email address found for this contact");
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invoice");
      }

      toast.success(`Invoice sent to ${email}`);
      fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    }
  };

  if (loading && !data) {
    return <InvoicesLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices and track payments
          </p>
        </div>
        <Button asChild>
          <Link href="/sales/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.outstanding, "USD")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <InvoicesFilters accounts={accounts} />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <InvoicesTable
            invoices={data?.invoices || []}
            onDelete={handleDelete}
            onSend={handleSend}
          />
        </CardContent>
      </Card>

      {/* Pagination info */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{" "}
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
            {data.pagination.total} invoices
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(data.pagination.page - 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page === data.pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(data.pagination.page + 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoicesLoading />}>
      <InvoicesContent />
    </Suspense>
  );
}
