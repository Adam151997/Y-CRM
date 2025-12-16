"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

interface CalculateHealthButtonProps {
  accountId: string;
  variant?: "default" | "outline";
}

export function CalculateHealthButton({ accountId, variant = "default" }: CalculateHealthButtonProps) {
  const router = useRouter();
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch("/api/cs/health/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to calculate health score");
      }

      toast.success("Health score calculated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to calculate");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Button 
      onClick={handleCalculate} 
      disabled={isCalculating}
      variant={variant}
    >
      {isCalculating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {isCalculating ? "Calculating..." : "Calculate Health Score"}
    </Button>
  );
}
