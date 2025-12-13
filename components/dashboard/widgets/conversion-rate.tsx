"use client";

import { useEffect, useState } from "react";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversionRateData {
  rate: number;
  totalLeads: number;
  convertedLeads: number;
  change: number;
}

export function ConversionRateWidget() {
  const [data, setData] = useState<ConversionRateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leads to calculate conversion rate
        const response = await fetch("/api/leads?limit=100");
        if (response.ok) {
          const result = await response.json();
          const leads = result.data || result.leads || [];
          const total = leads.length;
          const converted = leads.filter((l: { status: string }) => l.status === "CONVERTED").length;
          const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
          
          setData({
            rate,
            totalLeads: total,
            convertedLeads: converted,
            change: 5, // Placeholder - would need historical data
          });
        }
      } catch (error) {
        console.error("Error fetching conversion rate:", error);
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

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-8 w-8 text-purple-500" />
        <span className="text-3xl font-bold">{data.rate}%</span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        {data.convertedLeads} of {data.totalLeads} leads converted
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
        <span>{data.change >= 0 ? "+" : ""}{data.change}% vs last month</span>
      </div>
    </div>
  );
}
