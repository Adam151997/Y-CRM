"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Loader2 } from "lucide-react";

interface RecalculateAllButtonProps {
  accountsWithoutHealth: number;
}

export function RecalculateAllButton({ accountsWithoutHealth }: RecalculateAllButtonProps) {
  const router = useRouter();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const response = await fetch("/api/cs/health/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to recalculate");
      }

      const result = await response.json();
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to recalculate");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isRecalculating}>
          {isRecalculating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRecalculating ? "Calculating..." : "Recalculate All"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recalculate All Health Scores</AlertDialogTitle>
          <AlertDialogDescription>
            This will recalculate health scores for all accounts based on current CRM data including activities, tickets, contacts, renewals, and invoices.
            {accountsWithoutHealth > 0 && (
              <span className="block mt-2 text-orange-600">
                {accountsWithoutHealth} account{accountsWithoutHealth !== 1 ? "s" : ""} will get health scores for the first time.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRecalculating}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRecalculate} disabled={isRecalculating}>
            {isRecalculating ? "Calculating..." : "Recalculate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
