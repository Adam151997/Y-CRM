import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DollarSign, Plus } from "lucide-react";

interface Payroll {
  id: string;
  payPeriod: string;
  grossPay: unknown;
  totalDeductions: unknown;
  netPay: unknown;
  status: string;
  currency: string;
}

interface EmployeePayrollsProps {
  payrolls: Payroll[];
  employeeId: string;
  currency: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSED: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
};

export function EmployeePayrolls({ payrolls, employeeId, currency }: EmployeePayrollsProps) {
  const formatCurrency = (amount: unknown, curr: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(Number(amount) || 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payroll History
          </CardTitle>
          <CardDescription>Recent payroll records</CardDescription>
        </div>
        <Button asChild>
          <Link href={`/hr/payroll/new?employeeId=${employeeId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Payroll
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {payrolls.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payroll records found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
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
                  <TableCell className="font-mono">{payroll.payPeriod}</TableCell>
                  <TableCell>{formatCurrency(payroll.grossPay, payroll.currency)}</TableCell>
                  <TableCell className="text-red-600">
                    -{formatCurrency(payroll.totalDeductions, payroll.currency)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payroll.netPay, payroll.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[payroll.status]}>{payroll.status}</Badge>
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
      </CardContent>
    </Card>
  );
}
