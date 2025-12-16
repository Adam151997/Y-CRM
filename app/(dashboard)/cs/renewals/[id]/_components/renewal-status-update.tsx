"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, TrendingDown, TrendingUp } from "lucide-react";

interface RenewalStatusUpdateProps {
  renewal: {
    id: string;
    status: string;
    contractValue: number;
    currency: string;
  };
}

export function RenewalStatusUpdate({ renewal }: RenewalStatusUpdateProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  
  // Form state for outcome details
  const [renewalValue, setRenewalValue] = useState(renewal.contractValue.toString());
  const [churnReason, setChurnReason] = useState("");
  const [expansionAmount, setExpansionAmount] = useState("");

  const handleQuickStatus = async (newStatus: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/cs/renewals/${renewal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutcomeSubmit = async () => {
    if (!selectedOutcome) return;
    
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        status: selectedOutcome,
        outcome: selectedOutcome,
      };

      if (selectedOutcome === "RENEWED" || selectedOutcome === "EXPANDED") {
        payload.renewalValue = parseFloat(renewalValue) || renewal.contractValue;
      }

      if (selectedOutcome === "EXPANDED" && expansionAmount) {
        payload.expansionAmount = parseFloat(expansionAmount);
      }

      if (selectedOutcome === "CHURNED" && churnReason) {
        payload.churnReason = churnReason;
      }

      if (selectedOutcome === "DOWNGRADED") {
        payload.renewalValue = parseFloat(renewalValue) || 0;
      }

      const response = await fetch(`/api/cs/renewals/${renewal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update renewal");
      }

      toast.success("Renewal outcome recorded");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: renewal.currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-3">
      {/* Quick Status Updates */}
      {renewal.status === "UPCOMING" && (
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => handleQuickStatus("IN_PROGRESS")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4 mr-2 text-yellow-500" />
          )}
          Start Renewal Process
        </Button>
      )}

      {/* Outcome Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="default">
            <CheckCircle className="h-4 w-4 mr-2" />
            Record Outcome
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Renewal Outcome</DialogTitle>
            <DialogDescription>
              Current contract value: {formatCurrency(renewal.contractValue)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Outcome Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedOutcome === "RENEWED" ? "default" : "outline"}
                className="h-auto py-3 flex-col"
                onClick={() => setSelectedOutcome("RENEWED")}
              >
                <CheckCircle className="h-5 w-5 mb-1 text-green-500" />
                <span>Renewed</span>
              </Button>
              <Button
                variant={selectedOutcome === "EXPANDED" ? "default" : "outline"}
                className="h-auto py-3 flex-col"
                onClick={() => setSelectedOutcome("EXPANDED")}
              >
                <TrendingUp className="h-5 w-5 mb-1 text-emerald-500" />
                <span>Expanded</span>
              </Button>
              <Button
                variant={selectedOutcome === "DOWNGRADED" ? "default" : "outline"}
                className="h-auto py-3 flex-col"
                onClick={() => setSelectedOutcome("DOWNGRADED")}
              >
                <TrendingDown className="h-5 w-5 mb-1 text-orange-500" />
                <span>Downgraded</span>
              </Button>
              <Button
                variant={selectedOutcome === "CHURNED" ? "default" : "outline"}
                className="h-auto py-3 flex-col"
                onClick={() => setSelectedOutcome("CHURNED")}
              >
                <XCircle className="h-5 w-5 mb-1 text-red-500" />
                <span>Churned</span>
              </Button>
            </div>

            {/* Outcome-specific fields */}
            {selectedOutcome === "RENEWED" && (
              <div className="space-y-2">
                <Label>New Contract Value</Label>
                <Input
                  type="number"
                  value={renewalValue}
                  onChange={(e) => setRenewalValue(e.target.value)}
                  placeholder={renewal.contractValue.toString()}
                />
              </div>
            )}

            {selectedOutcome === "EXPANDED" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Contract Value</Label>
                  <Input
                    type="number"
                    value={renewalValue}
                    onChange={(e) => setRenewalValue(e.target.value)}
                    placeholder={renewal.contractValue.toString()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expansion Amount</Label>
                  <Input
                    type="number"
                    value={expansionAmount}
                    onChange={(e) => setExpansionAmount(e.target.value)}
                    placeholder="Additional value"
                  />
                </div>
              </div>
            )}

            {selectedOutcome === "DOWNGRADED" && (
              <div className="space-y-2">
                <Label>New Contract Value</Label>
                <Input
                  type="number"
                  value={renewalValue}
                  onChange={(e) => setRenewalValue(e.target.value)}
                  placeholder="Reduced value"
                />
              </div>
            )}

            {selectedOutcome === "CHURNED" && (
              <div className="space-y-2">
                <Label>Churn Reason</Label>
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOutcomeSubmit}
              disabled={!selectedOutcome || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
