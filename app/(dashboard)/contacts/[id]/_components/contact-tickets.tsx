"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
import { Ticket, Plus, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TicketData {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  category?: string | null;
  createdAt: Date;
}

interface ContactTicketsProps {
  tickets: TicketData[];
  contactId: string;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-500",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-500",
  WAITING_ON_CUSTOMER: "bg-purple-500/10 text-purple-500",
  WAITING_ON_INTERNAL: "bg-orange-500/10 text-orange-500",
  RESOLVED: "bg-green-500/10 text-green-500",
  CLOSED: "bg-slate-500/10 text-slate-500",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-500",
  MEDIUM: "bg-blue-500/10 text-blue-500",
  HIGH: "bg-orange-500/10 text-orange-500",
  URGENT: "bg-red-500/10 text-red-500",
};

export function ContactTickets({ tickets, contactId }: ContactTicketsProps) {
  const openCount = tickets.filter((t) =>
    ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "WAITING_ON_INTERNAL"].includes(t.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-2xl font-bold">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Open Tickets</p>
            <p className="text-2xl font-bold text-blue-600">{openCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/cs/tickets/new?contactId=${contactId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Link>
        </Button>
      </div>

      {/* Tickets Table */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-4">
              Support tickets for this contact will appear here.
            </p>
            <Button asChild>
              <Link href={`/cs/tickets/new?contactId=${contactId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Ticket
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/cs/tickets/${ticket.id}`}
                      className="hover:underline"
                    >
                      {ticket.ticketNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {ticket.subject}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[ticket.status]}>
                      {ticket.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[ticket.priority]}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/cs/tickets/${ticket.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
