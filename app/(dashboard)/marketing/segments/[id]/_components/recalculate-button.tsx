"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle } from "lucide-react";

interface RecalculateButtonProps {
  segmentId: string;
}

export function RecalculateButton({ segmentId }: RecalculateButtonProps) {
  const router = useRouter();
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{
    memberCount: number;
    membersAdded: number;
    membersRemoved: number;
  } | null>(null);

  const handleRecalculate = async () => {
    setIsCalculating(true);
    setResult(null);

    try {
      const response = await fetch(`/api/marketing/segments/${segmentId}/calculate`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to calculate members");
      }

      const data = await response.json();
      setResult({
        memberCount: data.memberCount,
        membersAdded: data.membersAdded,
        membersRemoved: data.membersRemoved,
      });

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Error calculating segment members:", error);
      alert(error instanceof Error ? error.message : "Failed to calculate members");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={handleRecalculate}
        disabled={isCalculating}
      >
        {isCalculating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {isCalculating ? "Calculating..." : "Recalculate Members"}
      </Button>

      {result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
            <CheckCircle className="h-4 w-4" />
            Calculation Complete
          </div>
          <div className="text-green-600 space-y-1">
            <div>{result.memberCount.toLocaleString()} total members</div>
            {result.membersAdded > 0 && (
              <div className="text-xs">+{result.membersAdded} added</div>
            )}
            {result.membersRemoved > 0 && (
              <div className="text-xs">-{result.membersRemoved} removed</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
