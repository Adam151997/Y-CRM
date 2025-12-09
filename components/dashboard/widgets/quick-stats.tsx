"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

interface Stat {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

export function QuickStatsWidget() {
  const { workspace } = useWorkspace();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/dashboard/widgets/quick-stats?workspace=${workspace}`);
        if (response.ok) {
          const result = await response.json();
          setStats(result.stats || []);
        }
      } catch (error) {
        console.error("Error fetching quick stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspace]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No stats available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full items-center">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          {stat.change !== undefined && (
            <div className={cn(
              "flex items-center justify-center gap-1 text-xs mt-1",
              stat.change >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {stat.change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(stat.change)}% {stat.changeLabel || ""}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
