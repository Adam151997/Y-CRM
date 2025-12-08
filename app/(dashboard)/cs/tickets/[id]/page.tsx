import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TicketActions } from "./_components/ticket-actions";
import { TicketMessages } from "./_components/ticket-messages";
import { AddMessageForm } from "./_components/add-message-form";

interface PageProps {
  params: Promise<{ id: string }>;
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

const categoryLabels: Record<string, string> = {
  BUG: "Bug",
  BILLING: "Billing",
  FEATURE_REQUEST: "Feature Request",
  QUESTION: "Question",
  GENERAL: "General",
};

export default async function TicketDetailPage({ params }: PageProps) {
  const { orgId, userId } = await getAuthContext();
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, orgId },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/tickets">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">#{ticket.ticketNumber}</h1>
            <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
            <Badge variant="outline" className={priorityColors[ticket.priority]}>
              {ticket.priority}
            </Badge>
          </div>
          <h2 className="text-xl">{ticket.subject}</h2>
        </div>
        <TicketActions ticket={ticket} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {ticket.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Messages / Conversation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation
              </CardTitle>
              <CardDescription>
                {ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TicketMessages messages={ticket.messages} />
              <Separator />
              <AddMessageForm ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account */}
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Account</p>
                  <Link
                    href={`/cs/accounts/${ticket.account.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {ticket.account.name}
                  </Link>
                </div>
              </div>

              {/* Contact */}
              {ticket.contact && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-sm">
                      {ticket.contact.firstName} {ticket.contact.lastName}
                    </p>
                    {ticket.contact.email && (
                      <p className="text-xs text-muted-foreground">{ticket.contact.email}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Category */}
              {ticket.category && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm">{categoryLabels[ticket.category] || ticket.category}</p>
                  </div>
                </div>
              )}

              {/* Created */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* First Response */}
              {ticket.firstResponseAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">First Response</p>
                    <p className="text-sm">
                      {format(new Date(ticket.firstResponseAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Resolution */}
              {ticket.resolvedAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Resolved</p>
                    <p className="text-sm">
                      {format(new Date(ticket.resolvedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {ticket.resolution && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {ticket.resolution}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          {(ticket.sentiment || ticket.aiSummary) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.sentiment && (
                  <div>
                    <p className="text-sm font-medium">Sentiment</p>
                    <Badge
                      variant="outline"
                      className={
                        ticket.sentiment === "POSITIVE"
                          ? "text-green-600"
                          : ticket.sentiment === "NEGATIVE"
                          ? "text-red-600"
                          : "text-slate-600"
                      }
                    >
                      {ticket.sentiment}
                    </Badge>
                  </div>
                )}
                {ticket.aiSummary && (
                  <div>
                    <p className="text-sm font-medium">Summary</p>
                    <p className="text-sm text-muted-foreground">{ticket.aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
