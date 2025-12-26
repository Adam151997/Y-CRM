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
import { Calendar, Plus } from "lucide-react";
import { format } from "date-fns";

interface Leave {
  id: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  days: unknown;
  reason: string | null;
}

interface EmployeeLeavesProps {
  leaves: Leave[];
  employeeId: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

const typeLabels: Record<string, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  UNPAID: "Unpaid",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  EMERGENCY: "Emergency",
  BEREAVEMENT: "Bereavement",
  OTHER: "Other",
};

export function EmployeeLeaves({ leaves, employeeId }: EmployeeLeavesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Leave History
          </CardTitle>
          <CardDescription>Recent leave requests and history</CardDescription>
        </div>
        <Button asChild>
          <Link href={`/hr/leaves/new?employeeId=${employeeId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Request Leave
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {leaves.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No leave requests found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>{typeLabels[leave.type] || leave.type}</TableCell>
                  <TableCell>
                    {format(new Date(leave.startDate), "MMM d")} -{" "}
                    {format(new Date(leave.endDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{String(leave.days)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[leave.status]}>{leave.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {leave.reason || "-"}
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
      </CardContent>
    </Card>
  );
}
