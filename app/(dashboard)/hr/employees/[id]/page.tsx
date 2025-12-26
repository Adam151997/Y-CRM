import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  Briefcase,
  Clock,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { EmployeeActions } from "./_components/employee-actions";
import { EmployeeLeaves } from "./_components/employee-leaves";
import { EmployeePayrolls } from "./_components/employee-payrolls";

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600 border-green-500/20",
  ON_LEAVE: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  TERMINATED: "bg-red-500/10 text-red-600 border-red-500/20",
  RESIGNED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const employmentTypeLabels: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, orgId },
    include: {
      leaves: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      payrolls: {
        orderBy: { payPeriod: "desc" },
        take: 10,
      },
      _count: {
        select: {
          leaves: true,
          payrolls: true,
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const formatCurrency = (amount: unknown, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(amount) || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hr/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {employee.firstName} {employee.lastName}
              </h1>
              <Badge variant="outline" className={statusColors[employee.status] || ""}>
                {employee.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {employee.position || "No position"} {employee.department && `• ${employee.department}`}
            </p>
            <p className="text-sm text-muted-foreground font-mono">{employee.employeeId}</p>
          </div>
        </div>
        <EmployeeActions employee={employee} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employment Type</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employmentTypeLabels[employee.employmentType] || employee.employmentType}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Join Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee.joinDate ? format(new Date(employee.joinDate), "MMM d, yyyy") : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee._count.leaves}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Records</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee._count.payrolls}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="leaves">Leave History</TabsTrigger>
          <TabsTrigger value="payroll">Payroll History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={\`mailto:\${employee.email}\`} className="text-primary hover:underline">
                      {employee.email}
                    </a>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href={\`tel:\${employee.phone}\`} className="text-primary hover:underline">
                        {employee.phone}
                      </a>
                    </div>
                  </div>
                )}
                {employee.address && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="whitespace-pre-line">
                        {typeof employee.address === "object"
                          ? JSON.stringify(employee.address, null, 2)
                          : String(employee.address)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{employee.department || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{employee.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employment Type</p>
                    <p className="font-medium">
                      {employmentTypeLabels[employee.employmentType] || employee.employmentType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusColors[employee.status] || ""}>
                      {employee.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {employee.managerId && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Reports To</p>
                      <p className="font-medium">{employee.managerId}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Compensation */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Compensation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Salary</p>
                    <p className="font-medium text-lg">
                      {employee.salary
                        ? formatCurrency(employee.salary, employee.currency || "USD")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salary Type</p>
                    <p className="font-medium">{employee.salaryType || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">{employee.currency || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Join Date</p>
                    <p className="font-medium">
                      {employee.joinDate
                        ? format(new Date(employee.joinDate), "MMMM d, yyyy")
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaves">
          <EmployeeLeaves leaves={employee.leaves} employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="payroll">
          <EmployeePayrolls payrolls={employee.payrolls} employeeId={employee.id} currency={employee.currency || "USD"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
