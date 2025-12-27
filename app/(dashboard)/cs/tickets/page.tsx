import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Ticket,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    priority?: string;
    query?: string;
  }>;
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500 text-white",
  OPEN: "bg-yellow-500 text-white",
  PENDING: "bg-purple-500 text-white",
  RESOLVED: "bg-green-500 text-white",
  CLOSED: "bg-slate-500 text-white",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default async function TicketsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const t = await getTranslations("modules.tickets");
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;
  const statusFilter = params.status;
  const priorityFilter = params.priority;
  const searchQuery = params.query;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (statusFilter && statusFilter !== "_all") {
    where.status = statusFilter;
  }
  if (priorityFilter && priorityFilter !== "_all") {
    where.priority = priorityFilter;
  }
  if (searchQuery) {
    where.OR = [
      { subject: { contains: searchQuery, mode: "insensitive" } },
      { ticketNumber: { equals: parseInt(searchQuery) || -1 } },
    ];
  }

  // Fetch tickets
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Build query string for pagination
  const buildQueryString = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(newPage));
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (searchQuery) params.set("query", searchQuery);
    return params.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/cs/tickets/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("addTicket")}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <form className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="query"
                    placeholder="Search tickets..."
                    defaultValue={searchQuery}
                    className="pl-9"
                  />
                </div>
                <Select name="status" defaultValue={statusFilter || "_all"}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Status</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select name="priority" defaultValue={priorityFilter || "_all"}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Priority</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="secondary">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No tickets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter || priorityFilter
                  ? "Try adjusting your filters"
                  : "Create your first support ticket"}
              </p>
              {!searchQuery && !statusFilter && !priorityFilter && (
                <Button asChild>
                  <Link href="/cs/tickets/new">Create Ticket</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link
                          href={`/cs/tickets/${ticket.id}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          #{ticket.ticketNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/cs/tickets/${ticket.id}`}
                          className="font-medium hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                        {ticket.contact && (
                          <p className="text-xs text-muted-foreground">
                            {ticket.contact.firstName} {ticket.contact.lastName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/cs/accounts/${ticket.account.id}`}
                          className="text-sm hover:underline"
                        >
                          {ticket.account.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ticket.status]}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} tickets
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      asChild={page > 1}
                    >
                      {page > 1 ? (
                        <Link href={`/cs/tickets?${buildQueryString(page - 1)}`}>
                          <ChevronLeft className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span><ChevronLeft className="h-4 w-4" /></span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      asChild={page < totalPages}
                    >
                      {page < totalPages ? (
                        <Link href={`/cs/tickets?${buildQueryString(page + 1)}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span><ChevronRight className="h-4 w-4" /></span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
