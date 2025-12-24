"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Minus } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stockLevel: number;
  unit: string;
}

interface StockAdjustmentDialogProps {
  item: InventoryItem | null;
  type: "add" | "remove";
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({
  item,
  type,
  onClose,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"RESTOCK" | "ADJUSTMENT" | "DAMAGE">(
    type === "add" ? "RESTOCK" : "ADJUSTMENT"
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = !!item;

  const handleClose = () => {
    setQuantity("");
    setReason("");
    setNotes("");
    setAdjustmentType(type === "add" ? "RESTOCK" : "ADJUSTMENT");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for this adjustment");
      return;
    }

    // For removal, make quantity negative
    const adjustedQty = type === "remove" ? -qty : qty;

    // Validate we won't go negative
    if (type === "remove" && qty > item.stockLevel) {
      toast.error(`Cannot remove more than current stock (${item.stockLevel} ${item.unit})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/inventory/${item.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: adjustedQty,
          type: adjustmentType,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to adjust stock");
      }

      const result = await response.json();
      toast.success(
        `Stock ${type === "add" ? "added" : "removed"}: ${item.stockLevel} → ${result.newLevel} ${item.unit}`
      );
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "add" ? (
              <Plus className="h-5 w-5 text-green-600" />
            ) : (
              <Minus className="h-5 w-5 text-red-600" />
            )}
            {type === "add" ? "Add Stock" : "Remove Stock"}
          </DialogTitle>
          <DialogDescription>
            {item?.name} ({item?.sku})
            <br />
            Current stock: <strong>{item?.stockLevel} {item?.unit}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Quantity */}
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={type === "remove" ? item?.stockLevel : undefined}
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {type === "add" && quantity && (
                <p className="text-sm text-muted-foreground">
                  New stock level: {(item?.stockLevel || 0) + parseInt(quantity || "0")} {item?.unit}
                </p>
              )}
              {type === "remove" && quantity && (
                <p className="text-sm text-muted-foreground">
                  New stock level: {(item?.stockLevel || 0) - parseInt(quantity || "0")} {item?.unit}
                </p>
              )}
            </div>

            {/* Adjustment Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={adjustmentType}
                onValueChange={(v) => setAdjustmentType(v as typeof adjustmentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {type === "add" ? (
                    <>
                      <SelectItem value="RESTOCK">Restock (Supplier delivery)</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment (Correction)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="ADJUSTMENT">Adjustment (Correction)</SelectItem>
                      <SelectItem value="DAMAGE">Damage (Write-off)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                placeholder="e.g., Received from supplier, Inventory count correction"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {type === "add" ? "Add Stock" : "Remove Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
