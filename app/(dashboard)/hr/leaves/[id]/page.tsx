"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Check,
  X,
  User,
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

interface Leave {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
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
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  UNPAID: "Unpaid Leave",
  MATERNITY: "Maternity Leave",
  PATERNITY: "Paternity Leave",
  EMERGENCY: "Emergency Leave",
  BEREAVEMENT: "Bereavement Leave",
  OTHER: "Other",
};

export default function LeaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [leave, setLeave] = useState<Leave | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchLeave();
  }, [params.id]);

  const fetchLeave = async () => {
    try {
      const response = await fetch(`/api/leaves/${params.id}`);
      if (!response.ok) {
        throw new Error("Leave not found");
      }
      const data = await response.json();
      setLeave(data);
    } catch (error) {
      toast.error("Failed to load leave request");
      router.push("/hr/leaves");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/leaves/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve");
      }
      toast.success("Leave request approved");
      fetchLeave();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/leaves/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject");
      }
      toast.success("Leave request rejected");
      fetchLeave();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!leave) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hr/leaves">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {TYPE_LABELS[leave.type] || leave.type}
              <Badge className={STATUS_COLORS[leave.status]}>
                {leave.status}
              </Badge>
            </h2>
            <p className="text-muted-foreground">
              Requested by {leave.employee.firstName} {leave.employee.lastName}
            </p>
          </div>
        </div>
        {leave.status === "PENDING" && (
          <div className="flex gap-2">
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={processing}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Leave Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please provide a reason for rejecting this leave request.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-4">
                  <Label htmlFor="rejectionReason">Reason (optional)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReject} disabled={processing}>
                    {processing ? "Rejecting..." : "Reject"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leave Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{TYPE_LABELS[leave.type] || leave.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={STATUS_COLORS[leave.status]}>{leave.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(leave.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(leave.endDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Days</p>
              <p className="font-medium">{leave.days} day(s)</p>
            </div>
            {leave.reason && (
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-medium">{leave.reason}</p>
              </div>
            )}
            {leave.rejectionReason && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 font-medium">Rejection Reason</p>
                <p className="text-sm text-red-700">{leave.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {leave.employee.firstName} {leave.employee.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{leave.employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <p className="font-medium font-mono">{leave.employee.employeeId}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{leave.employee.department || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">{leave.employee.position || "-"}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/hr/employees/${leave.employee.id}`}>
                View Employee Profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div>
                  <p className="font-medium">Request Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(leave.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {leave.approvedAt && (
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    leave.status === "APPROVED" ? "bg-green-500" : "bg-red-500"
                  }`} />
                  <div>
                    <p className="font-medium">
                      {leave.status === "APPROVED" ? "Approved" : "Rejected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(leave.approvedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
