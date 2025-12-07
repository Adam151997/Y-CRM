"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Opportunity {
  id: string;
  name: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: Date | null;
  closedWon: boolean | null;
  createdAt: Date;
  account: {
    id: string;
    name: string;
  };
  stage: {
    id: string;
    name: string;
    color: string | null;
  };
  _count: {
    notes: number;
    tasks: number;
  };
}

interface PipelineStage {
  id: string;
  name: string;
  color: string | null;
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  stages: PipelineStage[];
  page: number;
  totalPages: number;
  total: number;
}

export function OpportunitiesTable({
  opportunities,
  stages,
  page,
  totalPages,
  total,
}: OpportunitiesTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Opportunity deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete opportunity");
    }
  };

  const handleClose = async (id: string, won: boolean) => {
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closedWon: won,
          actualCloseDate: new Date(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success(won ? "Opportunity marked as won!" : "Opportunity marked as lost");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update opportunity");
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Opportunity</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-center">Probability</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-muted-foreground">No opportunities found</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/opportunities/new">Create your first opportunity</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              opportunities.map((opportunity) => (
                <TableRow key={opportunity.id} className="group">
                  <TableCell>
                    <Link
                      href={`/opportunities/${opportunity.id}`}
                      className="font-medium hover:underline"
                    >
                      {opportunity.name}
                    </Link>
                    {opportunity.closedWon !== null && (
                      <Badge
                        variant="outline"
                        className={`ml-2 ${
                          opportunity.closedWon
                            ? "border-green-500 text-green-500"
                            : "border-red-500 text-red-500"
                        }`}
                      >
                        {opportunity.closedWon ? "Won" : "Lost"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/accounts/${opportunity.account.id}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {opportunity.account.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: opportunity.stage.color || undefined,
                        color: opportunity.stage.color || undefined,
                      }}
                    >
                      {opportunity.stage.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(opportunity.value), opportunity.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={opportunity.probability}
                        className="w-16 h-2"
                      />
                      <span className="text-sm text-muted-foreground w-10">
                        {opportunity.probability}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {opportunity.expectedCloseDate ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(opportunity.expectedCloseDate), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/opportunities/${opportunity.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/opportunities/${opportunity.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {opportunity.closedWon === null && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleClose(opportunity.id, true)}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Won
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleClose(opportunity.id, false)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark as Lost
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(opportunity.id, opportunity.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
            {total} opportunities
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/opportunities?page=${page - 1}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(`/opportunities?page=${page + 1}`)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
