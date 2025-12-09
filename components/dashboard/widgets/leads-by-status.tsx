"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeadStatus {
  status: string;
  count: number;
  percentage: number;
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-purple-100 text-purple-700",
  QUALIFIED: "bg-green-100 text-green-700",
  CONVERTED: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
};

const statusBarColors: Record<string, string> = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-purple-500",
  QUALIFIED: "bg-green-500",
  CONVERTED: "bg-emerald-500",
  LOST: "bg-red-500",
};

export function LeadsByStatusWidget() {
  const [data, setData] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/leads-by-status");
        if (response.ok) {
          const result = await response.json();
          setData(result.statuses || []);
        }
      } catch (error) {
        console.error("Error fetching leads by status:", error);
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No leads yet
      </div>
    );
  }

  const total = data.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-3">
      {data.map((status) => (
        <div key={status.status} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", statusColors[status.status] || "bg-gray-100 text-gray-700")}>
                {status.status}
              </Badge>
            </div>
            <span className="font-medium">{status.count}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", statusBarColors[status.status] || "bg-gray-500")}
              style={{ width: `${total > 0 ? (status.count / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
