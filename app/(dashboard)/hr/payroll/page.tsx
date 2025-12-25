"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, DollarSign } from "lucide-react";

interface Payroll {
  id: string;
  payPeriod: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  status: string;
  paymentDate: string | null;
  currency: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSED: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
};

export default function PayrollPage() {
  const searchParams = useSearchParams();

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [payPeriod, setPayPeriod] = useState(searchParams.get("payPeriod") || "");

  useEffect(() => {
    fetchPayrolls();
  }, [page, status, payPeriod]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (status) params.set("status", status);
      if (payPeriod) params.set("payPeriod", payPeriod);

      const response = await fetch(`/api/payroll?${params}`);
      const data = await response.json();

      setPayrolls(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching payrolls:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(parseFloat(amount));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Payroll Management
          </h2>
          <p className="text-muted-foreground">
            Process and manage employee payroll
          </p>
        </div>
        <Button asChild>
          <Link href="/hr/payroll/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Payroll
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PROCESSED">Processed</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            {total} record{total !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No payroll records found</h3>
              <p className="text-muted-foreground mb-4">
                Create a payroll run to get started
              </p>
              <Button asChild>
                <Link href="/hr/payroll/new">Create Payroll</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payroll.employee.firstName} {payroll.employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payroll.employee.employeeId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{payroll.payPeriod}</TableCell>
                    <TableCell>{formatCurrency(payroll.grossPay, payroll.currency)}</TableCell>
                    <TableCell className="text-red-600">
                      -{formatCurrency(payroll.totalDeductions, payroll.currency)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payroll.netPay, payroll.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[payroll.status]}>
                        {payroll.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/hr/payroll/${payroll.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
