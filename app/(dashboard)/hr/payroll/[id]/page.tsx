"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  DollarSign,
  User,
  Calendar,
  Check,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Payroll {
  id: string;
  payPeriod: string;
  startDate: string;
  endDate: string;
  baseSalary: string;
  overtime: string;
  bonus: string;
  commission: string;
  allowances: string;
  grossPay: string;
  taxDeduction: string;
  insuranceDeduction: string;
  retirementDeduction: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
  currency: string;
  status: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    department: string | null;
    position: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSED: "bg-purple-100 text-purple-700",
  PAID: "bg-green-100 text-green-700",
};

export default function PayrollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayroll();
  }, [params.id]);

  const fetchPayroll = async () => {
    try {
      const response = await fetch(`/api/payroll/${params.id}`);
      if (!response.ok) {
        throw new Error("Payroll not found");
      }
      const data = await response.json();
      setPayroll(data);
    } catch (error) {
      toast.error("Failed to load payroll");
      router.push("/hr/payroll");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/payroll/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          paymentDate: newStatus === "PAID" ? new Date().toISOString() : undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }
      toast.success(`Payroll marked as ${newStatus.toLowerCase()}`);
      fetchPayroll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/payroll/${params.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Payroll deleted successfully");
      router.push("/hr/payroll");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: payroll?.currency || "USD",
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!payroll) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hr/payroll">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Payroll: {payroll.payPeriod}
              <Badge className={STATUS_COLORS[payroll.status]}>
                {payroll.status}
              </Badge>
            </h2>
            <p className="text-muted-foreground">
              {payroll.employee.firstName} {payroll.employee.lastName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {payroll.status === "DRAFT" && (
            <>
              <Button onClick={() => updateStatus("PENDING")} disabled={processing}>
                Submit for Approval
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={processing}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Payroll</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this payroll record?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {payroll.status === "PENDING" && (
            <Button onClick={() => updateStatus("APPROVED")} disabled={processing} className="bg-blue-600">
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {payroll.status === "APPROVED" && (
            <Button onClick={() => updateStatus("PROCESSED")} disabled={processing}>
              Mark as Processed
            </Button>
          )}
          {payroll.status === "PROCESSED" && (
            <Button onClick={() => updateStatus("PAID")} disabled={processing} className="bg-green-600">
              <Check className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pay Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pay Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Earnings</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Base Salary</span>
                  <span>{formatCurrency(payroll.baseSalary)}</span>
                </div>
                {parseFloat(payroll.overtime) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Overtime</span>
                    <span>{formatCurrency(payroll.overtime)}</span>
                  </div>
                )}
                {parseFloat(payroll.bonus) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Bonus</span>
                    <span>{formatCurrency(payroll.bonus)}</span>
                  </div>
                )}
                {parseFloat(payroll.commission) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Commission</span>
                    <span>{formatCurrency(payroll.commission)}</span>
                  </div>
                )}
                {parseFloat(payroll.allowances) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Allowances</span>
                    <span>{formatCurrency(payroll.allowances)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Gross Pay</span>
                <span>{formatCurrency(payroll.grossPay)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Deductions</h4>
              <div className="space-y-1 text-red-600">
                {parseFloat(payroll.taxDeduction) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>-{formatCurrency(payroll.taxDeduction)}</span>
                  </div>
                )}
                {parseFloat(payroll.insuranceDeduction) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Insurance</span>
                    <span>-{formatCurrency(payroll.insuranceDeduction)}</span>
                  </div>
                )}
                {parseFloat(payroll.retirementDeduction) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Retirement</span>
                    <span>-{formatCurrency(payroll.retirementDeduction)}</span>
                  </div>
                )}
                {parseFloat(payroll.otherDeductions) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Other</span>
                    <span>-{formatCurrency(payroll.otherDeductions)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-medium text-red-600 pt-2 border-t">
                <span>Total Deductions</span>
                <span>-{formatCurrency(payroll.totalDeductions)}</span>
              </div>
            </div>

            <div className="flex justify-between text-xl font-bold pt-4 border-t-2">
              <span>Net Pay</span>
              <span className="text-green-600">{formatCurrency(payroll.netPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Employee & Period Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {payroll.employee.firstName} {payroll.employee.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-medium font-mono">{payroll.employee.employeeId}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{payroll.employee.department || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{payroll.employee.position || "-"}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/hr/employees/${payroll.employee.id}`}>
                  View Employee Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pay Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="font-medium font-mono">{payroll.payPeriod}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {new Date(payroll.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {new Date(payroll.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {payroll.paymentDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">
                    {new Date(payroll.paymentDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {payroll.paymentMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{payroll.paymentMethod.replace("_", " ")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {payroll.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{payroll.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
