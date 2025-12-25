import { Suspense } from "react";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, UserCheck, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getHRStats(orgId: string) {
  const [
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    pendingLeaves,
    approvedLeavesThisMonth,
    pendingPayrolls,
  ] = await Promise.all([
    prisma.employee.count({ where: { orgId } }),
    prisma.employee.count({ where: { orgId, status: "ACTIVE" } }),
    prisma.employee.count({ where: { orgId, status: "ON_LEAVE" } }),
    prisma.leave.count({ where: { orgId, status: "PENDING" } }),
    prisma.leave.count({
      where: {
        orgId,
        status: "APPROVED",
        startDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.payroll.count({ where: { orgId, status: { in: ["DRAFT", "PENDING"] } } }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    pendingLeaves,
    approvedLeavesThisMonth,
    pendingPayrolls,
  };
}

async function getRecentLeaveRequests(orgId: string) {
  return prisma.leave.findMany({
    where: { orgId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
        },
      },
    },
  });
}

async function getRecentEmployees(orgId: string) {
  return prisma.employee.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      position: true,
      joinDate: true,
      status: true,
    },
  });
}

export default async function HRDashboardPage() {
  const { orgId } = await getAuthContext();

  const [stats, pendingLeaves, recentEmployees] = await Promise.all([
    getHRStats(orgId),
    getRecentLeaveRequests(orgId),
    getRecentEmployees(orgId),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">HR Dashboard</h2>
          <p className="text-muted-foreground">
            Manage employees, leave requests, and payroll
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/hr/employees/new">Add Employee</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEmployees} active, {stats.onLeaveEmployees} on leave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedLeavesThisMonth} approved this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payrolls</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayrolls}</div>
            <p className="text-xs text-muted-foreground">
              Draft and pending approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Items */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pending Leave Requests
            </CardTitle>
            <CardDescription>Requests awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.map((leave: { id: string; type: string; startDate: Date; endDate: Date; employee: { firstName: string; lastName: string; department: string | null } }) => (
                  <div key={leave.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {leave.employee.firstName} {leave.employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leave.type} • {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/hr/leaves/${leave.id}`}>Review</Link>
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/hr/leaves?status=PENDING">View All Requests</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Employees
            </CardTitle>
            <CardDescription>Newly added team members</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees yet</p>
            ) : (
              <div className="space-y-4">
                {recentEmployees.map((employee: { id: string; firstName: string; lastName: string; department: string | null; position: string | null; joinDate: Date | null; status: string }) => (
                  <div key={employee.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {employee.position || "No position"} • {employee.department || "No department"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      employee.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                      employee.status === "ON_LEAVE" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {employee.status}
                    </span>
                  </div>
                ))}
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/hr/employees">View All Employees</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link href="/hr/employees/new">
                <Users className="h-5 w-5" />
                <span>Add Employee</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link href="/hr/leaves/new">
                <Calendar className="h-5 w-5" />
                <span>Request Leave</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link href="/hr/payroll/new">
                <DollarSign className="h-5 w-5" />
                <span>Create Payroll</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link href="/hr/leaves?status=PENDING">
                <AlertTriangle className="h-5 w-5" />
                <span>Review Leaves</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
