"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineValueData {
  totalValue: number;
  count: number;
  change: number;
  currency: string;
}

export function PipelineValueWidget() {
  const [data, setData] = useState<PipelineValueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/pipeline-value");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching pipeline value:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-8 w-8 text-green-500" />
        <span className="text-3xl font-bold">{formatCurrency(data.totalValue)}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        {data.count} open opportunities
      </p>
      <div className={cn(
        "flex items-center gap-1 text-sm",
        data.change >= 0 ? "text-green-600" : "text-red-600"
      )}>
        {data.change >= 0 ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span>{Math.abs(data.change)}% vs last month</span>
      </div>
    </div>
  );
}
