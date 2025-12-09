"use client";

import { useEffect, useState } from "react";
import { FileInput, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSubmissionsData {
  total: number;
  thisWeek: number;
  lastWeek: number;
  activeForms: number;
}

export function FormSubmissionsWidget() {
  const [data, setData] = useState<FormSubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/marketing/forms?isActive=true");
        if (response.ok) {
          const result = await response.json();
          const totalSubmissions = result.forms?.reduce((sum: number, f: { submissions: number }) => sum + (f.submissions || 0), 0) || 0;
          setData({
            total: totalSubmissions,
            thisWeek: Math.floor(totalSubmissions * 0.1), // Placeholder
            lastWeek: Math.floor(totalSubmissions * 0.08), // Placeholder
            activeForms: result.forms?.length || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching form submissions:", error);
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

  const change = data.lastWeek > 0 
    ? Math.round(((data.thisWeek - data.lastWeek) / data.lastWeek) * 100) 
    : 0;

  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex items-center gap-2 mb-1">
        <FileInput className="h-8 w-8 text-blue-500" />
        <span className="text-3xl font-bold">{data.total}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Total submissions from {data.activeForms} forms
      </p>
      {data.thisWeek > 0 && (
        <div className={cn(
          "flex items-center gap-1 text-sm",
          change >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {change >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{data.thisWeek} this week ({change >= 0 ? "+" : ""}{change}%)</span>
        </div>
      )}
    </div>
  );
}
