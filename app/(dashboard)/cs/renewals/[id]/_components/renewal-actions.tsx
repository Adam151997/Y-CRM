"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  TrendingDown,
  TrendingUp,
  Trash2,
  Loader2,
} from "lucide-react";

interface Renewal {
  id: string;
  status: string;
  contractValue: unknown;
}

interface RenewalActionsProps {
  renewal: Renewal;
}

export function RenewalActions({ renewal }: RenewalActionsProps) {
  const router = useRouter();
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [outcomeType, setOutcomeType] = useState<string>("");
  const [renewalValue, setRenewalValue] = useState(String(renewal.contractValue));
  const [churnReason, setChurnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenOutcome = (type: string) => {
    setOutcomeType(type);
    setShowOutcomeDialog(true);
  };

  const handleSubmitOutcome = async () => {
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        status: outcomeType === "CHURNED" ? "CHURNED" : "RENEWED",
        outcome: outcomeType,
        renewalValue: parseFloat(renewalValue) || Number(renewal.contractValue),
      };

      if (outcomeType === "CHURNED" && churnReason) {
        body.churnReason = churnReason;
      }

      if (outcomeType === "EXPANDED") {
        body.expansionAmount = parseFloat(renewalValue) - Number(renewal.contractValue);
      }

      if (notes) {
        body.notes = notes;
      }

      const response = await fetch(`/api/cs/renewals/${renewal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update renewal");
      }

      toast.success(`Renewal marked as ${outcomeType.toLowerCase()}`);
      setShowOutcomeDialog(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update renewal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = renewal.status === "RENEWED" || renewal.status === "CHURNED";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isCompleted && (
            <>
              <DropdownMenuItem onClick={() => handleOpenOutcome("RENEWED")}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Mark as Renewed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenOutcome("EXPANDED")}>
                <TrendingUp className="h-4 w-4 mr-2 text-emerald-500" />
                Mark as Expanded
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenOutcome("DOWNGRADED")}>
                <TrendingDown className="h-4 w-4 mr-2 text-orange-500" />
                Mark as Downgraded
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenOutcome("CHURNED")}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Mark as Churned
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Renewal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outcome Dialog */}
      <Dialog open={showOutcomeDialog} onOpenChange={setShowOutcomeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {outcomeType === "RENEWED" && "Mark as Renewed"}
              {outcomeType === "EXPANDED" && "Mark as Expanded"}
              {outcomeType === "DOWNGRADED" && "Mark as Downgraded"}
              {outcomeType === "CHURNED" && "Mark as Churned"}
            </DialogTitle>
            <DialogDescription>
              {outcomeType === "CHURNED" 
                ? "Record the churn reason for this renewal."
                : "Update the renewal value and add any notes."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {outcomeType !== "CHURNED" && (
              <div className="space-y-2">
                <Label htmlFor="renewalValue">
                  {outcomeType === "EXPANDED" ? "New Contract Value" : "Renewal Value"}
                </Label>
                <Input
                  id="renewalValue"
                  type="number"
                  value={renewalValue}
                  onChange={(e) => setRenewalValue(e.target.value)}
                  placeholder="Enter amount"
                />
                {outcomeType === "EXPANDED" && parseFloat(renewalValue) > Number(renewal.contractValue) && (
                  <p className="text-sm text-green-600">
                    Expansion: +${(parseFloat(renewalValue) - Number(renewal.contractValue)).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {outcomeType === "CHURNED" && (
              <div className="space-y-2">
                <Label htmlFor="churnReason">Churn Reason</Label>
                <Select value={churnReason} onValueChange={setChurnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPETITOR">Switched to Competitor</SelectItem>
                    <SelectItem value="BUDGET">Budget Constraints</SelectItem>
                    <SelectItem value="NO_VALUE">Not Seeing Value</SelectItem>
                    <SelectItem value="PRODUCT_FIT">Product Fit Issues</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOutcomeDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitOutcome} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
