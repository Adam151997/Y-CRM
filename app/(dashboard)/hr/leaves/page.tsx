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
import { Plus, Calendar, Filter } from "lucide-react";

interface Leave {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  UNPAID: "Unpaid",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  EMERGENCY: "Emergency",
  BEREAVEMENT: "Bereavement",
  OTHER: "Other",
};

export default function LeavesPage() {
  const searchParams = useSearchParams();

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [type, setType] = useState(searchParams.get("type") || "");

  useEffect(() => {
    fetchLeaves();
  }, [page, status, type]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (status) params.set("status", status);
      if (type) params.set("type", type);

      const response = await fetch(`/api/leaves?${params}`);
      const data = await response.json();

      setLeaves(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Leave Management
          </h2>
          <p className="text-muted-foreground">
            Track and manage employee leave requests
          </p>
        </div>
        <Button asChild>
          <Link href="/hr/leaves/new">
            <Plus className="h-4 w-4 mr-2" />
            Request Leave
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
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(val) => { setType(val); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="ANNUAL">Annual</SelectItem>
                <SelectItem value="SICK">Sick</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="MATERNITY">Maternity</SelectItem>
                <SelectItem value="PATERNITY">Paternity</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="BEREAVEMENT">Bereavement</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {total} request{total !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No leave requests found</h3>
              <p className="text-muted-foreground mb-4">
                Create a new leave request to get started
              </p>
              <Button asChild>
                <Link href="/hr/leaves/new">Request Leave</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {leave.employee.firstName} {leave.employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {leave.employee.department || leave.employee.employeeId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{TYPE_LABELS[leave.type] || leave.type}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(leave.startDate).toLocaleDateString()} -{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{leave.days}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[leave.status]}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/hr/leaves/${leave.id}`}>View</Link>
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
