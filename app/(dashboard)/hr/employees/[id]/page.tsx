"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Mail,
  Phone,
  Building,
  Calendar,
  DollarSign,
  Clock,
  FileText,
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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employeeId: string;
  department: string | null;
  position: string | null;
  employmentType: string;
  status: string;
  joinDate: string;
  salary: string | null;
  salaryType: string;
  currency: string;
  createdAt: string;
  leaves: Array<{
    id: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    days: string;
  }>;
  payrolls: Array<{
    id: string;
    payPeriod: string;
    netPay: string;
    status: string;
    paymentDate: string | null;
  }>;
  _count: {
    leaves: number;
    payrolls: number;
    tasks: number;
    notes: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  ON_LEAVE: "bg-yellow-100 text-yellow-700",
  TERMINATED: "bg-red-100 text-red-700",
  RESIGNED: "bg-gray-100 text-gray-700",
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      if (!response.ok) {
        throw new Error("Employee not found");
      }
      const data = await response.json();
      setEmployee(data);
    } catch (error) {
      toast.error("Failed to load employee");
      router.push("/hr/employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/employees/${params.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete employee");
      }
      toast.success("Employee deleted successfully");
      router.push("/hr/employees");
    } catch (error) {
      toast.error("Failed to delete employee");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hr/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {employee.firstName} {employee.lastName}
              <Badge className={STATUS_COLORS[employee.status]}>
                {employee.status}
              </Badge>
            </h2>
            <p className="text-muted-foreground">
              {employee.position || "No position"} • {employee.department || "No department"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/hr/employees/${employee.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this employee? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Employee Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono">{employee.employeeId}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {new Date(employee.joinDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Compensation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.salary ? (
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: employee.currency,
                  }).format(parseFloat(employee.salary))}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    / {employee.salaryType.toLowerCase()}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground">No salary information</p>
              )}
              <div className="text-sm text-muted-foreground">
                Employment Type: {employee.employmentType.replace("_", " ")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{employee._count.leaves}</div>
                  <div className="text-xs text-muted-foreground">Leaves</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{employee._count.payrolls}</div>
                  <div className="text-xs text-muted-foreground">Payrolls</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{employee._count.tasks}</div>
                  <div className="text-xs text-muted-foreground">Tasks</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{employee._count.notes}</div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="md:col-span-2">
          <Card>
            <Tabs defaultValue="leaves">
              <CardHeader>
                <TabsList>
                  <TabsTrigger value="leaves">Leave History</TabsTrigger>
                  <TabsTrigger value="payroll">Payroll History</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="leaves" className="mt-0">
                  {employee.leaves.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No leave records yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employee.leaves.map((leave) => (
                        <div
                          key={leave.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{leave.type} Leave</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(leave.startDate).toLocaleDateString()} -{" "}
                              {new Date(leave.endDate).toLocaleDateString()} ({leave.days} days)
                            </p>
                          </div>
                          <Badge
                            className={
                              leave.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : leave.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : leave.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {leave.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payroll" className="mt-0">
                  {employee.payrolls.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payroll records yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {employee.payrolls.map((payroll) => (
                        <div
                          key={payroll.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">Period: {payroll.payPeriod}</p>
                            <p className="text-sm text-muted-foreground">
                              Net Pay: {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: employee.currency,
                              }).format(parseFloat(payroll.netPay))}
                            </p>
                          </div>
                          <Badge
                            className={
                              payroll.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : payroll.status === "APPROVED"
                                ? "bg-blue-100 text-blue-700"
                                : payroll.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {payroll.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
