"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal, 
  CheckCircle, 
  Clock, 
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Ticket {
  id: string;
  ticketNumber: number;
  status: string;
  priority: string;
}

interface TicketActionsProps {
  ticket: Ticket;
}

export function TicketActions({ ticket }: TicketActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const updateStatus = async (status: string, resolution?: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/cs/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status,
          ...(resolution && { resolution }),
          ...(status === "RESOLVED" && { resolvedAt: new Date().toISOString() }),
          ...(status === "CLOSED" && { closedAt: new Date().toISOString() }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }

      toast.success(`Ticket marked as ${status.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update ticket status");
    } finally {
      setIsUpdating(false);
      setShowResolveDialog(false);
      setShowCloseDialog(false);
    }
  };

  const updatePriority = async (priority: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/cs/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });

      if (!response.ok) {
        throw new Error("Failed to update priority");
      }

      toast.success(`Priority updated to ${priority.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update priority");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Actions
                <MoreHorizontal className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {ticket.status !== "OPEN" && (
            <DropdownMenuItem onClick={() => updateStatus("OPEN")}>
              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
              Mark as Open
            </DropdownMenuItem>
          )}
          
          {ticket.status !== "PENDING" && (
            <DropdownMenuItem onClick={() => updateStatus("PENDING")}>
              <AlertTriangle className="h-4 w-4 mr-2 text-purple-500" />
              Mark as Pending
            </DropdownMenuItem>
          )}
          
          {ticket.status !== "RESOLVED" && (
            <DropdownMenuItem onClick={() => setShowResolveDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Mark as Resolved
            </DropdownMenuItem>
          )}
          
          {ticket.status !== "CLOSED" && (
            <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
              <XCircle className="h-4 w-4 mr-2 text-slate-500" />
              Close Ticket
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
            ticket.priority !== priority && (
              <DropdownMenuItem 
                key={priority} 
                onClick={() => updatePriority(priority)}
              >
                {priority.charAt(0) + priority.slice(1).toLowerCase()}
              </DropdownMenuItem>
            )
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resolve Dialog */}
      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Ticket #{ticket.ticketNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the ticket as resolved. The customer will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => updateStatus("RESOLVED")}
              className="bg-green-600 hover:bg-green-700"
            >
              Resolve Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Ticket #{ticket.ticketNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the ticket. It can be reopened later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateStatus("CLOSED")}>
              Close Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
