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
  UserPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Ticket {
  id: string;
  ticketNumber: number;
  status: string;
  priority: string;
  assignedToId: string | null;
}

interface TeamMember {
  id: string;
  name: string;
}

interface TicketActionsProps {
  ticket: Ticket;
  teamMembers: TeamMember[];
}

export function TicketActions({ ticket, teamMembers }: TicketActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(ticket.assignedToId || "");

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

  const updateAssignment = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/cs/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignedToId: selectedAssignee === "_unassigned" ? null : selectedAssignee 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update assignment");
      }

      toast.success("Ticket reassigned successfully");
      setShowAssignDialog(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to reassign ticket");
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

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Reassign Ticket
          </DropdownMenuItem>
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

      {/* Reassign Dialog */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reassign Ticket #{ticket.ticketNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              Select a team member to assign this ticket to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="assignee">Assign To</Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={updateAssignment} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
