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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  status: string;
  source: string | null;
  createdAt: Date;
  pipelineStage: {
    id: string;
    name: string;
    color: string | null;
  } | null;
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

interface LeadsTableProps {
  leads: Lead[];
  pipelineStages: PipelineStage[];
  page: number;
  totalPages: number;
  total: number;
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CONTACTED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  QUALIFIED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  CONVERTED: "bg-green-500/10 text-green-500 border-green-500/20",
  LOST: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function LeadsTable({
  leads,
  pipelineStages,
  page,
  totalPages,
  total,
}: LeadsTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Lead deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Lead</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <p className="text-muted-foreground">No leads found</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/leads/new">Add your first lead</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center space-x-3 hover:underline"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {lead.firstName[0]}
                          {lead.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lead.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {lead.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {lead.company && (
                      <div>
                        <p className="font-medium">{lead.company}</p>
                        {lead.title && (
                          <p className="text-xs text-muted-foreground">
                            {lead.title}
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.pipelineStage && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: lead.pipelineStage.color || undefined,
                          color: lead.pipelineStage.color || undefined,
                        }}
                      >
                        {lead.pipelineStage.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[lead.status] || ""}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.source && (
                      <span className="text-sm text-muted-foreground">
                        {lead.source.replace("_", " ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center text-xs">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {lead._count.notes}
                      </span>
                      <span className="flex items-center text-xs">
                        <CheckSquare className="h-3 w-3 mr-1" />
                        {lead._count.tasks}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
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
                          <Link href={`/leads/${lead.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/leads/${lead.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            handleDelete(
                              lead.id,
                              `${lead.firstName} ${lead.lastName}`
                            )
                          }
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
            {total} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/leads?page=${page - 1}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(`/leads?page=${page + 1}`)}
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
