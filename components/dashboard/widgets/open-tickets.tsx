"use client";

import { useEffect, useState } from "react";
import { Ticket, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketCounts {
  total: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export function OpenTicketsWidget() {
  const [data, setData] = useState<TicketCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/widgets/open-tickets");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching open tickets:", error);
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

  const priorities = [
    { key: "urgent", label: "Urgent", count: data.urgent, color: "text-red-600 bg-red-100", icon: AlertCircle },
    { key: "high", label: "High", count: data.high, color: "text-orange-600 bg-orange-100", icon: AlertTriangle },
    { key: "medium", label: "Medium", count: data.medium, color: "text-yellow-600 bg-yellow-100", icon: Info },
    { key: "low", label: "Low", count: data.low, color: "text-blue-600 bg-blue-100", icon: Ticket },
  ];

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="h-8 w-8 text-blue-500" />
        <span className="text-3xl font-bold">{data.total}</span>
        <span className="text-muted-foreground">open</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {priorities.map((priority) => (
          <div
            key={priority.key}
            className={cn("flex items-center gap-2 p-2 rounded-lg", priority.color.split(" ")[1])}
          >
            <priority.icon className={cn("h-4 w-4", priority.color.split(" ")[0])} />
            <span className="text-sm font-medium">{priority.count}</span>
            <span className="text-xs text-muted-foreground">{priority.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
