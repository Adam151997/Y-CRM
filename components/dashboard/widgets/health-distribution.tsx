"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HealthBucket {
  range: string;
  count: number;
  color: string;
}

export function HealthDistributionWidget() {
  const [data, setData] = useState<HealthBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/health-distribution");
        if (response.ok) {
          const result = await response.json();
          setData(result.buckets || []);
        }
      } catch (error) {
        console.error("Error fetching health distribution:", error);
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

  // Default buckets if no data
  const buckets = data.length > 0 ? data : [
    { range: "0-25", count: 0, color: "bg-red-500" },
    { range: "26-50", count: 0, color: "bg-orange-500" },
    { range: "51-75", count: 0, color: "bg-yellow-500" },
    { range: "76-100", count: 0, color: "bg-green-500" },
  ];

  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-between gap-2 flex-1 min-h-0">
        {buckets.map((bucket) => (
          <div key={bucket.range} className="flex flex-col items-center flex-1">
            <span className="text-sm font-medium mb-1">{bucket.count}</span>
            <div className="w-full bg-muted rounded-t-sm relative" style={{ height: "100px" }}>
              <div
                className={cn("absolute bottom-0 w-full rounded-t-sm transition-all", bucket.color)}
                style={{ height: `${total > 0 ? (bucket.count / maxCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-1">{bucket.range}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-center">
        <span className="text-sm text-muted-foreground">Health Score Ranges</span>
      </div>
    </div>
  );
}
